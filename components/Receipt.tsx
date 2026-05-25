import { CopyButton } from "@/components/CopyButton";
import { ReceiptShareRowInner } from "@/components/Receipt.shareRow";
import { StatusBadge } from "@/components/StatusBadge";
import { formatAmount, formatDate, truncateAddress } from "@/lib/format";
import type { PaymentRequest, PaymentRequestStatus } from "@/types/payment";

/**
 * Base Point — `<Receipt />`.
 *
 * Server-renderable presentational component. Renders the same payment
 * data twice in two parallel "modes":
 *
 *   - Screen mode (`.bp-screen-only` blocks): the rich dark-theme
 *     status card, line-item card, fields grid, and tx-hash panel
 *     used inside the live checkout and on the public receipt page.
 *
 *   - Print mode (`.bp-print-only` blocks): a compact, black-on-white
 *     POS-style receipt — branded BASE POINT header, receipt id +
 *     status row, merchant/customer block, semantic <table> line
 *     item, paid-via / network / recipient / tx / timestamps meta
 *     grid, and "Thank you for your payment." footer.
 *
 * The two modes are mutually exclusive thanks to `app/globals.css`'s
 * @media screen / @media print rules. Crucially, `.bp-print-only`
 * elements are only hidden inside `@media screen`, not under a
 * universal selector, so Tailwind utility classes like `grid` /
 * `flex` on those same elements still apply on paper.
 *
 * The small action row with copy-receipt-link + print buttons lives
 * in its own `"use client"` file (`Receipt.shareRow.tsx`); pass
 * `hideShareRow` from a page that already provides equivalent
 * actions (e.g. the public receipt page's top action bar).
 */

const STATUS_DESCRIPTION: Record<PaymentRequestStatus, string> = {
  pending: "Waiting for the customer to pay.",
  processing: "Payment submitted. Waiting for on-chain confirmation.",
  completed: "Payment confirmed on Base.",
  failed: "The payment did not go through. The customer can try again.",
};

const STATUS_PRINT_LABEL: Record<PaymentRequestStatus, string> = {
  pending: "PENDING",
  processing: "PROCESSING",
  completed: "PAID",
  failed: "FAILED",
};

const STATUS_ACCENT: Record<PaymentRequestStatus, string> = {
  pending:
    "border-white/10 bg-white/[0.03] before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent",
  processing:
    "border-blue-400/30 bg-blue-500/5 before:bg-gradient-to-r before:from-transparent before:via-blue-400/40 before:to-transparent",
  completed:
    "border-emerald-400/30 bg-emerald-500/5 before:bg-gradient-to-r before:from-transparent before:via-emerald-400/40 before:to-transparent",
  failed:
    "border-rose-400/30 bg-rose-500/5 before:bg-gradient-to-r before:from-transparent before:via-rose-400/40 before:to-transparent",
};

function paymentIdLabel(paidVia: PaymentRequest["paidVia"]): string {
  if (paidVia === "wallet") return "Transaction hash";
  if (paidVia === "base-pay") return "Base Pay payment id";
  return "Payment id";
}

function paidViaPrintLabel(paidVia: PaymentRequest["paidVia"]): string {
  if (paidVia === "wallet") return "Wallet";
  if (paidVia === "base-pay") return "Base Pay";
  return "\u2014";
}

interface Props {
  payment: PaymentRequest;
  /**
   * Hide the inline share/print row at the bottom of the receipt. Used
   * by `/receipt/[id]` where a dedicated top action bar already
   * provides Copy and Print buttons.
   */
  hideShareRow?: boolean;
}

export function Receipt({ payment, hideShareRow = false }: Props) {
  const hasItem =
    payment.itemName !== undefined ||
    payment.merchantName !== undefined ||
    payment.quantity !== undefined ||
    payment.unitPriceUsdc !== undefined ||
    payment.customerLabel !== undefined;

  const printQty = payment.quantity ?? 1;
  const printUnitPrice =
    payment.unitPriceUsdc !== undefined
      ? formatAmount(payment.unitPriceUsdc)
      : formatAmount(payment.amountUsdc);

  return (
    <div
      className={`bp-receipt-print relative overflow-hidden rounded-2xl border p-5 shadow-2xl shadow-black/20 backdrop-blur transition-colors before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px sm:p-6 ${STATUS_ACCENT[payment.status]}`}
    >
      {/* ============================================================ */}
      {/* PRINT-ONLY: branded header                                    */}
      {/* ============================================================ */}
      <header className="bp-print-only border-b border-slate-300 pb-2">
        <p className="text-xl font-bold tracking-[0.18em]">BASE POINT</p>
        <p className="text-sm">USDC Receipt</p>
      </header>

      {/* PRINT-ONLY: receipt id + status row */}
      <dl className="bp-print-only mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-sm">
        {payment.receiptId ? (
          <>
            <dt className="font-medium">Receipt:</dt>
            <dd className="font-mono">{payment.receiptId}</dd>
          </>
        ) : null}
        <dt className="font-medium">Status:</dt>
        <dd className="font-semibold">{STATUS_PRINT_LABEL[payment.status]}</dd>
      </dl>

      {/* PRINT-ONLY: merchant + customer */}
      {payment.merchantName || payment.customerLabel ? (
        <dl className="bp-print-only mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-sm">
          {payment.merchantName ? (
            <>
              <dt className="font-medium">Merchant:</dt>
              <dd>{payment.merchantName}</dd>
            </>
          ) : null}
          {payment.customerLabel ? (
            <>
              <dt className="font-medium">Customer:</dt>
              <dd>{payment.customerLabel}</dd>
            </>
          ) : null}
        </dl>
      ) : null}

      {/* ============================================================ */}
      {/* SCREEN-ONLY: rich header with status badge + receipt id        */}
      {/* ============================================================ */}
      <div className="bp-screen-only flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
            {payment.merchantName ? "Receipt" : "Payment status"}
          </h2>
          {payment.merchantName ? (
            <p className="mt-1 text-base font-semibold text-white">
              {payment.merchantName}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-slate-300">
            {STATUS_DESCRIPTION[payment.status]}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <StatusBadge status={payment.status} />
          {payment.receiptId ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
              #{payment.receiptId}
            </span>
          ) : null}
        </div>
      </div>

      {/* SHARED: error message, kept on both surfaces in muted form */}
      {payment.errorMessage ? (
        <div
          role="alert"
          className="mt-3 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
        >
          {payment.errorMessage}
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* PRINT-ONLY: line item table                                    */}
      {/* ============================================================ */}
      {hasItem && payment.itemName ? (
        <table className="bp-print-only mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-300">
              <th className="py-1 pr-2 text-left text-[10pt] font-semibold uppercase tracking-wide">
                Item
              </th>
              <th className="px-2 py-1 text-right text-[10pt] font-semibold uppercase tracking-wide">
                Qty
              </th>
              <th className="px-2 py-1 text-right text-[10pt] font-semibold uppercase tracking-wide">
                Price
              </th>
              <th className="py-1 pl-2 text-right text-[10pt] font-semibold uppercase tracking-wide">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1.5 pr-2">{payment.itemName}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {printQty}
              </td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                {printUnitPrice}
              </td>
              <td className="py-1.5 pl-2 text-right font-mono font-semibold tabular-nums">
                {formatAmount(payment.amountUsdc)} USDC
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}

      {/* PRINT-ONLY: total fallback when there is no itemised line */}
      {!hasItem || !payment.itemName ? (
        <p className="bp-print-only mt-3 flex items-baseline justify-between border-t border-slate-300 pt-2 text-sm">
          <span className="font-medium">Total</span>
          <span className="font-mono font-semibold">
            {formatAmount(payment.amountUsdc)} USDC
          </span>
        </p>
      ) : null}

      {/* ============================================================ */}
      {/* SCREEN-ONLY: rich line item card                              */}
      {/* ============================================================ */}
      {hasItem ? (
        <div className="bp-screen-only mt-5 rounded-xl border border-white/10 bg-slate-950/40 p-4">
          {payment.itemName ? (
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">
                  {payment.itemName}
                </p>
                {payment.unitPriceUsdc !== undefined &&
                payment.quantity !== undefined ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {payment.quantity} &times;{" "}
                    <span className="font-mono">
                      {formatAmount(payment.unitPriceUsdc)} USDC
                    </span>
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 font-mono text-base font-semibold text-white">
                {formatAmount(payment.amountUsdc)} USDC
              </p>
            </div>
          ) : (
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-slate-400">Total</p>
              <p className="font-mono text-base font-semibold text-white">
                {formatAmount(payment.amountUsdc)} USDC
              </p>
            </div>
          )}
          {payment.customerLabel ? (
            <p className="mt-3 border-t border-white/5 pt-3 text-xs text-slate-400">
              <span className="text-slate-500">For:</span>{" "}
              <span className="text-slate-200">{payment.customerLabel}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* SCREEN-ONLY: rich fields grid                                  */}
      {/* ============================================================ */}
      <dl className="bp-screen-only mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        {!hasItem ? (
          <Field label="Amount">
            <span className="font-mono text-slate-100">
              {formatAmount(payment.amountUsdc)} USDC
            </span>
          </Field>
        ) : null}
        <Field label="Recipient">
          <span
            className="truncate font-mono text-slate-200"
            title={payment.recipient}
          >
            {truncateAddress(payment.recipient, 8, 6)}
          </span>
        </Field>
        <Field label="Network">
          <span className="text-slate-200">Base &middot; Mainnet</span>
        </Field>
        <Field label="Created">
          <span className="text-slate-200">
            {formatDate(payment.createdAt)}
          </span>
        </Field>
        {payment.submittedAt ? (
          <Field label="Submitted">
            <span className="text-slate-200">
              {formatDate(payment.submittedAt)}
            </span>
          </Field>
        ) : null}
        {payment.settledAt ? (
          <Field label="Settled">
            <span className="text-slate-200">
              {formatDate(payment.settledAt)}
            </span>
          </Field>
        ) : null}
      </dl>

      {/* ============================================================ */}
      {/* PRINT-ONLY: compact meta list                                  */}
      {/* ============================================================ */}
      <dl className="bp-print-only mt-3 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-sm">
        <dt className="font-medium">Paid via:</dt>
        <dd>{paidViaPrintLabel(payment.paidVia)}</dd>
        <dt className="font-medium">Network:</dt>
        <dd>Base Mainnet</dd>
        <dt className="font-medium">Recipient:</dt>
        <dd className="break-all font-mono text-[10pt]">
          {payment.recipient}
        </dd>
        {payment.paymentId ? (
          <>
            <dt className="font-medium">{paymentIdLabel(payment.paidVia)}:</dt>
            <dd className="break-all font-mono text-[9pt]">
              {payment.paymentId}
            </dd>
          </>
        ) : null}
        <dt className="font-medium">Created:</dt>
        <dd>{formatDate(payment.createdAt)}</dd>
        {payment.submittedAt ? (
          <>
            <dt className="font-medium">Submitted:</dt>
            <dd>{formatDate(payment.submittedAt)}</dd>
          </>
        ) : null}
        {payment.settledAt ? (
          <>
            <dt className="font-medium">Settled:</dt>
            <dd>{formatDate(payment.settledAt)}</dd>
          </>
        ) : null}
      </dl>

      {/* ============================================================ */}
      {/* SCREEN-ONLY: tx hash / payment id panel                        */}
      {/* ============================================================ */}
      {payment.paymentId ? (
        <div className="bp-screen-only mt-5 rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              {paymentIdLabel(payment.paidVia)}
            </p>
            <CopyButton value={payment.paymentId} size="inline" label="Copy" />
          </div>
          <p
            className="mt-2 break-all font-mono text-xs text-slate-300 sm:text-sm"
            title={payment.paymentId}
          >
            {payment.paymentId}
          </p>
        </div>
      ) : null}

      {/* PRINT-ONLY: footer */}
      <p className="bp-print-only mt-3 border-t border-slate-300 pt-2 text-center text-[10pt] italic">
        Thank you for your payment.
      </p>

      {/* SCREEN-ONLY: share / print row (hidden on print and on pages
          that provide their own action bar). */}
      {!hideShareRow && payment.receiptId ? (
        <ReceiptShareRowInner receiptId={payment.receiptId} />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Helpers                                                               */
/* -------------------------------------------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 truncate">{children}</dd>
    </div>
  );
}
