"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { NetworkBadge } from "@/components/NetworkBadge";
import { PaymentQrCard } from "@/components/PaymentQrCard";
import { PayWithBaseButton } from "@/components/PayWithBaseButton";
import { PayWithWalletButton } from "@/components/PayWithWalletButton";
import { Receipt } from "@/components/Receipt";
import { SuccessAnimation } from "@/components/SuccessAnimation";
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
      // Defensive check for legacy / external mutations that might use
      // the literal string "paid" as a synonym of "completed".
      (state.payment.status as string) === "paid");

  return (
    <div className="relative flex-1">
      <div
        aria-hidden="true"
        className="bp-no-print pointer-events-none absolute inset-x-0 top-0 -z-0 mx-auto h-72 w-full max-w-3xl bg-[radial-gradient(closest-side,rgba(33,81,245,0.25),transparent_75%)] blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/*
          Heading + warning callout: screen-only. When the merchant
          prints from this page, none of these surrounding elements
          should land on paper — only the receipt below.
        */}
        <div className="bp-no-print flex flex-col items-start gap-4">
          <NetworkBadge />
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Checkout
          </h1>
          <p className="max-w-xl text-sm text-slate-400">
            Pay in USDC on Base. Scan the QR with your phone, tap{" "}
            <span className="font-medium text-slate-200">Pay with Base</span>,
            or continue with any EVM wallet.
          </p>
          <div
            role="note"
            className="flex w-full flex-col gap-1 rounded-xl border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-xs text-amber-100/90 sm:text-sm"
          >
            <span className="font-semibold text-amber-200">
              Mainnet mode uses real USDC.
            </span>
            <span className="text-amber-100/80">
              Customers need USDC on Base. Wallet payments may require Base
              ETH for gas. Pay with Base remains the simpler path.
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {state.phase === "loading" ? (
            <div className="bp-no-print">
              <LoadingSkeleton />
            </div>
          ) : null}
          {state.phase === "missing" ? (
            <div className="bp-no-print">
              <MissingState />
            </div>
          ) : null}

          {state.phase === "loaded" ? (
            <>
              {isSuccess ? (
                <div className="bp-no-print">
                  <SuccessAnimation />
                </div>
              ) : null}

              <div className="bp-no-print">
                <PaymentQrCard payment={state.payment} />
              </div>

              <div className="bp-no-print relative space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
                />
                <PayWithBaseButton
                  payment={state.payment}
                  onUpdate={handlePaymentUpdate}
                />
                {state.payment.status !== "completed" ? (
                  <>
                    <div
                      className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-500"
                      aria-hidden="true"
                    >
                      <span className="h-px flex-1 bg-white/10" />
                      <span>or</span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    <PayWithWalletButton
                      payment={state.payment}
                      onUpdate={handlePaymentUpdate}
                    />
                  </>
                ) : null}
              </div>

              <Receipt payment={state.payment} />

              {state.payment.receiptId ? (
                <div className="bp-no-print flex justify-end">
                  <Link
                    href={`/receipt/${state.payment.receiptId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-cyan-300 transition-colors hover:text-white"
                  >
                    View public receipt
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
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
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

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="h-[196px] w-[196px] animate-pulse rounded-2xl bg-white/5" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          <div className="h-10 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-36 animate-pulse rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function MissingState() {
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
      <h2 className="mt-4 text-lg font-semibold text-white">
        Payment not found
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
        We couldn&apos;t find this payment request on this device. The MVP
        stores requests per-browser; if it was created on a different device
        you&apos;ll need to create a new one here.
      </p>
      <Link
        href="/create"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_40px_-12px_rgba(33,81,245,0.6)] transition-shadow hover:shadow-[0_18px_50px_-12px_rgba(33,81,245,0.85)]"
      >
        Create a new payment
      </Link>
    </div>
  );
}
