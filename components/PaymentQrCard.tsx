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
import { useState, useSyncExternalStore } from "react";

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
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is best-effort. Fall back silently — the URL is also
      // visible in the address bar.
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
        {/* QR ------------------------------------------------------- */}
        <div className="shrink-0 rounded-md border border-slate-200 bg-white p-3">
          {pageUrl ? (
            <QRCodeSVG
              value={pageUrl}
              size={192}
              level="M"
              marginSize={0}
              aria-label="QR code linking to this payment page"
            />
          ) : (
            <div
              className="h-48 w-48 animate-pulse rounded-sm bg-slate-100"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Details -------------------------------------------------- */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Amount
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
            {formatAmount(payment.amountUsdc)}{" "}
            <span className="text-base font-medium text-slate-500">USDC</span>
          </p>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-slate-500">Recipient</dt>
              <dd
                className="truncate font-mono text-slate-900"
                title={payment.recipient}
              >
                {truncateAddress(payment.recipient, 8, 6)}
              </dd>
            </div>
            {payment.note ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-slate-500">Note</dt>
                <dd className="text-right text-slate-900">{payment.note}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-slate-500">Network</dt>
              <dd className="text-slate-900">Base Sepolia &middot; Testnet</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCopy}
              disabled={!pageUrl}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <span className="text-xs text-slate-500">
              Customers can scan the QR or open this link.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
