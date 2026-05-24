"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PaymentQrCard } from "@/components/PaymentQrCard";
import { PayWithBaseButton } from "@/components/PayWithBaseButton";
import { PayWithWalletButton } from "@/components/PayWithWalletButton";
import { Receipt } from "@/components/Receipt";
import { SuccessAnimation } from "@/components/SuccessAnimation";
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
      setState(payment ? { phase: "loaded", payment } : { phase: "missing" });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePaymentUpdate = useCallback((updated: PaymentRequest) => {
    setState({ phase: "loaded", payment: updated });
  }, []);

  const isSuccess =
    state.phase === "loaded" &&
    (state.payment.status === "completed" ||
      (state.payment.status as string) === "paid");

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 to-slate-100/70">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <TestnetBadge />
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Checkout payment
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Pay in USDC on Base Sepolia. Scan the QR code, use Base Pay, or continue with Wallet.
        </p>

        <div className="mt-8 space-y-5">
          {state.phase === "loading" ? <LoadingSkeleton /> : null}
          {state.phase === "missing" ? <MissingState /> : null}
          {isSuccess ? <SuccessAnimation /> : null}
          {state.phase === "loaded" ? (
            <>
              <PaymentQrCard payment={state.payment} />
              <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                <PayWithBaseButton payment={state.payment} onUpdate={handlePaymentUpdate} />
                {state.payment.status !== "completed" ? (
                  <>
                    <div className="flex items-center gap-3 text-xs text-slate-400" aria-hidden="true">
                      <span className="h-px flex-1 bg-slate-200" />
                      <span>or</span>
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>
                    <PayWithWalletButton payment={state.payment} onUpdate={handlePaymentUpdate} />
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

function LoadingSkeleton() { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">Loading…</div>; }
function MissingState() { return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Payment not found</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-600">We couldn&apos;t find this payment request on this device.</p><Link href="/create" className="mt-5 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800">Create a new payment</Link></div>; }
