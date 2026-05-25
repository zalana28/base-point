"use client";

/**
 * Base Point — public receipt page (`/receipt/[id]`).
 *
 * Loads a payment by its human-readable `receiptId` (slug `[id]`) and
 * renders the shared `<Receipt />` component plus a small action bar
 * with Back / Copy / Print buttons. Designed to also look good when
 * printed — the print stylesheet in `app/globals.css` hides the
 * surrounding nav/footer/badge/action-bar so only the receipt card
 * lands on paper, and forces a clean black-on-white treatment.
 *
 * `<Receipt />` is rendered with `hideShareRow` so the duplicate
 * inline share/print row inside the receipt does not compete with
 * the canonical action bar at the top of this page.
 *
 * Constraints honoured here (do not relax):
 *  - No Base Pay calls. No `@base-org/account` import.
 *  - No direct `localStorage` access — go through `getPaymentStore()`.
 *  - No balance reads, no transaction-history reads, no block-explorer
 *    or third-party indexer.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { CopyButton } from "@/components/CopyButton";
import { NetworkBadge } from "@/components/NetworkBadge";
import { PrintButton } from "@/components/PrintButton";
import { Receipt } from "@/components/Receipt";
import { isReceiptIdLike } from "@/lib/receipt";
import { getPaymentStore } from "@/stores/paymentStore";
import type { PaymentRequest } from "@/types/payment";

type LoadState =
  | { phase: "loading" }
  | { phase: "missing" }
  | { phase: "invalid" }
  | { phase: "loaded"; payment: PaymentRequest };

const SUBSCRIBE_NOOP = () => () => {};
const getOrigin = (): string | null =>
  typeof window === "undefined" ? null : window.location.origin;
const getServerOrigin = (): string | null => null;

export default function PublicReceiptPage() {
  const params = useParams<{ id: string }>();
  const receiptId = params?.id ?? "";

  // Slug shape is decided synchronously from the URL, so we initialise
  // straight to the "invalid" terminal state when the slug doesn't
  // look like a receipt id. Only well-formed slugs flow into the
  // async load effect below — that keeps the effect free of state
  // updates that React 19 would otherwise flag as a cascading render.
  const initial: LoadState = receiptId
    ? isReceiptIdLike(receiptId)
      ? { phase: "loading" }
      : { phase: "invalid" }
    : { phase: "loading" };
  const [state, setState] = useState<LoadState>(initial);

  useEffect(() => {
    if (!receiptId) return;
    if (!isReceiptIdLike(receiptId)) return;
    let cancelled = false;
    (async () => {
      const payment = await getPaymentStore().getByReceiptId(receiptId);
      if (cancelled) return;
      setState(
        payment ? { phase: "loaded", payment } : { phase: "missing" },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  return (
    <div className="relative flex-1">
      <div
        aria-hidden="true"
        className="bp-no-print pointer-events-none absolute inset-x-0 top-0 -z-0 mx-auto h-72 w-full max-w-3xl bg-[radial-gradient(closest-side,rgba(33,81,245,0.22),transparent_75%)] blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="bp-no-print flex flex-col items-start gap-3">
          <NetworkBadge />
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Receipt
          </h1>
          <p className="max-w-xl text-sm text-slate-400">
            Public receipt for a Base Point payment request. Print or copy
            the link to share with the customer.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {state.phase === "loading" ? <LoadingSkeleton /> : null}
          {state.phase === "invalid" ? (
            <NotFound
              title="That receipt id doesn't look right"
              body="Receipt ids are formatted like BP-YYYYMMDD-XXXX. Double-check the link or create a new payment request."
            />
          ) : null}
          {state.phase === "missing" ? (
            <NotFound
              title="Receipt not found"
              body="We couldn't find this receipt on this device. Base Point's MVP stores receipts per-browser; if it was created on a different device you'll need to view it there or create a new one here."
            />
          ) : null}
          {state.phase === "loaded" ? (
            <>
              <ReceiptActions payment={state.payment} />

              <Receipt payment={state.payment} hideShareRow />

              {state.payment.status !== "completed" ? (
                <div className="bp-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur">
                  <p className="text-sm text-slate-300">
                    This receipt is still awaiting payment.
                  </p>
                  <Link
                    href={`/pay/${state.payment.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_40px_-12px_rgba(33,81,245,0.6)] transition-shadow hover:shadow-[0_18px_50px_-12px_rgba(33,81,245,0.85)]"
                  >
                    Open checkout
                  </Link>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Action bar shown above the receipt card on screen, hidden on print.
 *
 * Layout: a [Back to checkout] link on the left, [Copy receipt link]
 * + [Print receipt] buttons on the right. The receipt URL is computed
 * from the current origin via `useSyncExternalStore` so the SSR render
 * sees `null` and the client render sees the real URL — no hydration
 * mismatch.
 */
function ReceiptActions({ payment }: { payment: PaymentRequest }) {
  const origin = useSyncExternalStore(
    SUBSCRIBE_NOOP,
    getOrigin,
    getServerOrigin,
  );
  const url =
    origin && payment.receiptId
      ? `${origin}/receipt/${payment.receiptId}`
      : "";

  return (
    <div className="bp-no-print bp-receipt-print-actions flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur">
      <Link
        href={`/pay/${payment.id}`}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-300 transition-colors hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M19 12H5" />
          <path d="m11 18-6-6 6-6" />
        </svg>
        Back to checkout
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton value={url} label="Copy receipt link" />
        <PrintButton />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
        <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-72 animate-pulse rounded bg-white/10" />
        <div className="mt-6 h-20 w-full animate-pulse rounded-xl bg-white/[0.04]" />
        <div className="mt-2 h-3 w-40 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}

function NotFound({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl shadow-black/20 backdrop-blur">
      <div
        aria-hidden="true"
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{body}</p>
      <Link
        href="/create"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_40px_-12px_rgba(33,81,245,0.6)] transition-shadow hover:shadow-[0_18px_50px_-12px_rgba(33,81,245,0.85)]"
      >
        Create a new payment
      </Link>
    </div>
  );
}
