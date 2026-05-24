"use client";

/**
 * Base Point — `/pay/[id]`.
 *
 * Public payment page. Loads the payment-request record from the local
 * `PaymentStore`, renders the QR card, the Pay-with-Base action, and a
 * status receipt. The Base Pay SDK is invoked only inside
 * `<PayWithBaseButton />`, which goes through `lib/basePay.ts`.
 *
 * Constraints honoured here:
 *  - No `@base-org/account` import (that lives in `lib/basePay.ts`).
 *  - No direct `localStorage` access (goes through `getPaymentStore()`).
 *  - No mainnet, no balance reads, no transaction-history reads, no
 *    block-explorer or third-party indexer.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PaymentQrCard } from "@/components/PaymentQrCard";
import { PayWithBaseButton } from "@/components/PayWithBaseButton";
import { PayWithWalletButton } from "@/components/PayWithWalletButton";
import { Receipt } from "@/components/Receipt";
import { TestnetBadge } from "@/components/TestnetBadge";
import { getPaymentStore } from "@/stores/paymentStore";
import type { PaymentRequest } from "@/types/payment";

type LoadState =
  | { phase: "loading" }
  | { phase: "missing" }
  | { phase: "loaded"; payment: PaymentRequest };

export default function PayPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [state, setState] = useState<LoadState>({ phase: "loading" });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const payment = await getPaymentStore().getById(id);
      if (cancelled) return;
      if (!payment) {
        setState({ phase: "missing" });
      } else {
        setState({ phase: "loaded", payment });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePaymentUpdate = useCallback((updated: PaymentRequest) => {
    setState({ phase: "loaded", payment: updated });
  }, []);

  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16">
        <TestnetBadge />
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-900">
          Payment request
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Scan the QR code with a phone, or share the link directly. Payment
          settles in USDC on Base Sepolia.
        </p>

        <div className="mt-8 space-y-5">
          {state.phase === "loading" ? <LoadingSkeleton /> : null}
          {state.phase === "missing" ? <MissingState /> : null}
          {state.phase === "loaded" ? (
            <>
              <PaymentQrCard payment={state.payment} />
              <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <PayWithBaseButton
                  payment={state.payment}
                  onUpdate={handlePaymentUpdate}
                />
                {state.payment.status !== "completed" ? (
                  <>
                    <div
                      className="flex items-center gap-3 text-xs text-slate-400"
                      aria-hidden="true"
                    >
                      <span className="h-px flex-1 bg-slate-200" />
                      <span>or</span>
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>
                    <PayWithWalletButton
                      payment={state.payment}
                      onUpdate={handlePaymentUpdate}
                    />
                  </>
                ) : null}
              </div>
              <Receipt payment={state.payment} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="h-48 w-48 shrink-0 animate-pulse rounded-md bg-slate-100" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-7 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function MissingState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Payment not found
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        We couldn&rsquo;t find this payment request on this device. The MVP
        stores requests in the merchant&rsquo;s browser, so a request created
        elsewhere won&rsquo;t appear here. (Cross-device sharing arrives with
        the Supabase migration.)
      </p>
      <Link
        href="/create"
        className="mt-5 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
      >
        Create a new payment
      </Link>
    </div>
  );
}
