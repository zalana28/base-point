"use client";

/**
 * Base Point — `<PayWithBaseButton />`.
 *
 * The ONLY component (outside `lib/basePay.ts`) that triggers Base Pay.
 * On click it:
 *   1. calls `startPayment({ amount, to })` — pinned to testnet inside
 *      `lib/basePay.ts`, never here.
 *   2. persists the returned `paymentId` and flips the local request to
 *      `processing` via `getPaymentStore().update(...)`.
 *   3. polls `fetchPaymentStatus(paymentId)` every 2s, up to 90s, and
 *      persists the terminal status (`completed` or `failed`) when it
 *      arrives. After 90s without a terminal answer, polling stops and
 *      the local status stays `processing` with a "still pending" hint.
 *
 * Constraints honoured here (do not relax):
 *  - No `@base-org/account` import. Goes through `lib/basePay.ts`.
 *  - No raw `testnet:` literal. The testnet flag never leaves
 *    `lib/basePay.ts`.
 *  - No direct `localStorage` access. Goes through the `PaymentStore`.
 *  - No balance reads, no transaction-history reads, no block-explorer
 *    or third-party indexer.
 */

import { useEffect, useRef, useState } from "react";

import { fetchPaymentStatus, startPayment } from "@/lib/basePay";
import { getPaymentStore } from "@/stores/paymentStore";
import type { PaymentRequest } from "@/types/payment";

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 90_000;

interface Props {
  payment: PaymentRequest;
  /**
   * Notify the parent page when the local record changes (after the
   * optimistic `processing` write, and again on terminal status). The
   * parent should re-render with the updated record.
   */
  onUpdate: (updated: PaymentRequest) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Map the (often opaque) error thrown by `startPayment` into something
 * a customer can read. We deliberately don't surface raw stack traces.
 */
function describePayError(err: unknown): string {
  if (err instanceof Error) {
    if (/cancel|reject|denied|user/i.test(err.message)) {
      return "Payment was cancelled.";
    }
    return err.message;
  }
  return "Could not start the payment. Please try again.";
}

export function PayWithBaseButton({ payment, onUpdate }: Props) {
  const [inFlight, setInFlight] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  /**
   * Cancellation flag for the polling promise chain. We check it before
   * every state update / store write so a fast unmount doesn't write
   * stale state. Reset on (re-)mount to play nicely with React 19
   * StrictMode's double-invoke in development.
   */
  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // -------------------------------------------------------------------
  // Derived UI state
  // -------------------------------------------------------------------

  const completed = payment.status === "completed";
  const processing = payment.status === "processing";
  const failed = payment.status === "failed";
  const disabled = inFlight || completed || processing;

  let label: string;
  let showSpinner = false;
  if (completed) {
    label = "Paid";
  } else if (inFlight) {
    label = "Confirming\u2026";
    showSpinner = true;
  } else if (processing) {
    // Landed on a processing record without an active polling session
    // (e.g. the customer reloaded the page mid-confirmation). We don't
    // auto-resume polling in the MVP; show a clear non-spinning label.
    label = "Pending confirmation";
  } else if (failed) {
    label = "Pay with Base \u00b7 Retry";
  } else {
    label = "Pay with Base";
  }

  // -------------------------------------------------------------------
  // Polling
  // -------------------------------------------------------------------

  async function pollUntilTerminal(basePayId: string) {
    const startedAt = Date.now();

    while (true) {
      if (cancelledRef.current) return;

      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        if (!cancelledRef.current) {
          setTimedOut(true);
          setInFlight(false);
        }
        return;
      }

      let status;
      try {
        status = await fetchPaymentStatus(basePayId);
      } catch {
        // Transient error (network blip, rate limit). Retry silently.
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      if (cancelledRef.current) return;

      if (status.status === "completed") {
        try {
          const updated = await getPaymentStore().update(payment.id, {
            status: "completed",
            settledAt: Date.now(),
          });
          if (!cancelledRef.current) {
            onUpdate(updated);
            setInFlight(false);
          }
        } catch {
          if (!cancelledRef.current) setInFlight(false);
        }
        return;
      }

      if (status.status === "failed") {
        try {
          const updated = await getPaymentStore().update(payment.id, {
            status: "failed",
            settledAt: Date.now(),
            errorMessage: status.reason ?? status.message,
          });
          if (!cancelledRef.current) {
            onUpdate(updated);
            setInFlight(false);
          }
        } catch {
          if (!cancelledRef.current) setInFlight(false);
        }
        return;
      }

      // 'pending' or 'not_found' — keep polling.
      await sleep(POLL_INTERVAL_MS);
    }
  }

  // -------------------------------------------------------------------
  // Click handler
  // -------------------------------------------------------------------

  async function handleClick() {
    if (disabled) return;
    setLocalError(null);
    setTimedOut(false);
    setInFlight(true);

    let basePayId: string;
    try {
      const result = await startPayment({
        amount: payment.amountUsdc,
        to: payment.recipient,
      });
      basePayId = result.id;
    } catch (err) {
      if (!cancelledRef.current) {
        setLocalError(describePayError(err));
        setInFlight(false);
      }
      return;
    }

    // Optimistic local write: paymentId + processing.
    try {
      const updated = await getPaymentStore().update(payment.id, {
        paymentId: basePayId,
        paidVia: "base-pay",
        status: "processing",
        submittedAt: Date.now(),
        errorMessage: undefined,
      });
      if (!cancelledRef.current) onUpdate(updated);
    } catch (err) {
      if (!cancelledRef.current) {
        setLocalError(
          err instanceof Error
            ? err.message
            : "Could not record the payment locally.",
        );
        setInFlight(false);
      }
      return;
    }

    await pollUntilTerminal(basePayId);
  }

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div className="space-y-3">
      {localError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
        >
          {localError}
        </div>
      ) : null}

      {timedOut ? (
        <div
          role="status"
          className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-200"
        >
          Still pending. The payment may complete soon &mdash; check back
          later for the latest status.
        </div>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        aria-busy={inFlight ? "true" : undefined}
        className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_-12px_rgba(33,81,245,0.6)] transition-all duration-300 hover:shadow-[0_18px_50px_-12px_rgba(33,81,245,0.85)] disabled:cursor-not-allowed disabled:opacity-60 motion-safe:hover:enabled:-translate-y-0.5"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:enabled:translate-x-full motion-reduce:hidden"
        />
        <span
          aria-hidden="true"
          className="relative flex h-4 w-4 items-center justify-center rounded-sm bg-white/20 text-[10px] font-bold"
        >
          B
        </span>
        {showSpinner ? (
          <span
            className="relative h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
        ) : null}
        <span className="relative">{label}</span>
      </button>

      <p className="text-xs text-slate-500">
        Mainnet mode uses real USDC. Pay with Base settles on Base in
        seconds.
      </p>
    </div>
  );
}
