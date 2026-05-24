"use client";

/**
 * Base Point — `<PaymentQrCard />`.
 *
 * Renders the QR code, amount, recipient, and note for a payment
 * request. Client Component because it needs `window.location.href` to
 * encode the current page URL into the QR, and `navigator.clipboard`
 * for the "copy link" affordance.
 *
 * Constraints honoured here (do not relax):
 *  - No Base Pay calls; the SDK only lives in `lib/basePay.ts`.
 *  - No `@base-org/account` import.
 *  - No direct `localStorage` access.
 *  - No mainnet, no balance reads, no transaction-history reads, no
 *    block-explorer or third-party indexer.
 */

import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore } from "react";

import { CopyButton } from "@/components/CopyButton";
import { formatAmount, truncateAddress } from "@/lib/format";
import type { PaymentRequest } from "@/types/payment";

interface Props {
  payment: PaymentRequest;
}

/**
 * `window.location.href` snapshot helpers for `useSyncExternalStore`.
 *
 * We use this instead of `useEffect + setState` so the component reads
 * browser-only data without an SSR/hydration mismatch and without
 * tripping React 19's `react-hooks/set-state-in-effect` rule.
 *
 * The URL doesn't change during the page's lifetime, so `subscribe` is
 * a no-op — `useSyncExternalStore` only needs the server/client
 * snapshot pair to do the right thing during hydration.
 */
const SUBSCRIBE_NOOP = () => () => {};
const getCurrentPageUrl = (): string | null =>
  typeof window === "undefined" ? null : window.location.href;
const getServerPageUrl = (): string | null => null;

export function PaymentQrCard({ payment }: Props) {
  const pageUrl = useSyncExternalStore(
    SUBSCRIBE_NOOP,
    getCurrentPageUrl,
    getServerPageUrl,
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-7">
        {/* QR ------------------------------------------------------- */}
        <div className="shrink-0">
          <div className="relative rounded-2xl border border-white/10 bg-white p-3 shadow-lg shadow-blue-500/5">
            <div
              aria-hidden="true"
              className="absolute -inset-2 -z-10 rounded-3xl bg-gradient-to-br from-blue-500/20 via-cyan-300/15 to-emerald-300/10 blur-2xl"
            />
            {pageUrl ? (
              <QRCodeSVG
                value={pageUrl}
                size={196}
                level="M"
                marginSize={0}
                aria-label="QR code linking to this checkout page"
              />
            ) : (
              <div
                className="h-[196px] w-[196px] animate-pulse rounded-sm bg-slate-100"
                aria-hidden="true"
              />
            )}
          </div>
          <p className="mt-3 max-w-[14rem] text-center text-[11px] leading-relaxed text-slate-400">
            Scan with your phone camera to open this checkout page.
          </p>
        </div>

        {/* Details -------------------------------------------------- */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Amount due
          </p>
          <p className="mt-1.5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {formatAmount(payment.amountUsdc)}
            <span className="ml-2 align-baseline text-base font-medium text-slate-400 sm:text-lg">
              USDC
            </span>
          </p>

          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-slate-500">Recipient</dt>
              <dd
                className="truncate font-mono text-slate-200"
                title={payment.recipient}
              >
                {truncateAddress(payment.recipient, 8, 6)}
              </dd>
            </div>
            {payment.note ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-slate-500">Note</dt>
                <dd className="truncate text-right text-slate-200">
                  {payment.note}
                </dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-slate-500">Network</dt>
              <dd className="text-slate-200">
                Base Sepolia &middot; Testnet
              </dd>
            </div>
          </dl>

          <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">
              How to pay
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              This QR opens the Base Point checkout link. After opening it,
              choose <span className="font-medium text-white">Pay with Base</span>{" "}
              or <span className="font-medium text-white">Pay with Wallet</span>.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {pageUrl ? (
                <CopyButton value={pageUrl} label="Copy checkout link" />
              ) : (
                <CopyButton value="" label="Copy checkout link" />
              )}
              <span className="text-[11px] text-slate-500">
                Or share the link directly.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
