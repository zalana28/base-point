import { CopyButton } from "@/components/CopyButton";
import { ReceiptShareRowInner } from "@/components/Receipt.shareRow";
import { StatusBadge } from "@/components/StatusBadge";
import { formatAmount, formatDate, truncateAddress } from "@/lib/format";
import type { PaymentRequest, PaymentRequestStatus } from "@/types/payment";

/**
 * Base Point — `<Receipt />`.
 *
 * Server-renderable presentational component. The small action row
 * with the copy-receipt-link + print buttons lives in its own
 * `"use client"` file (`Receipt.shareRow.tsx`) so this file can stay
 * boundary-agnostic and consume well-typed payment data without any
 * client hooks of its own.
 *
 * Renders the status block, the line item, the on-chain identifier,
 * and the share/print row that the merchant and customer need from a
 * paid (or in-flight) request. Used on both `/pay/[id]` (where it sits
 * below the live checkout) and `/receipt/[id]` (where it is the page).
 *
 * Receipt URLs are derived from `payment.receiptId` plus the current
 * page origin inside the share row, rather than stored, so a future
 * Supabase adapter can persist a canonical URL without changing any
 * UI code.
 */

const STATUS_DESCRIPTION: Record<PaymentRequestStatus, string> = {
  pending: "Waiting for the customer to pay.",
  processing: "Payment submitted. Waiting for on-chain confirmation.",
  completed: "Payment confirmed on Base.",
  failed: "The payment did not go through. The customer can try again.",
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

export function Receipt({ payment }: { payment: PaymentRequest }) {
  const hasItem =
    payment.itemName !== undefined ||
    payment.merchantName !== undefined ||
    payment.quantity !== undefined ||
    payment.unitPriceUsdc !== undefined ||
    payment.customerLabel !== undefined;

  return (
    <div
      className={`bp-receipt-print relative overflow-hidden rounded-2xl border p-5 shadow-2xl shadow-black/20 backdrop-blur transition-colors before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px sm:p-6 ${STATUS_ACCENT[payment.status]}`}
    >
      {/* Header row ---------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

      {payment.errorMessage ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
        >
          {payment.errorMessage}
        </div>
      ) : null}

      {/* Line item ----------------------------------------------------- */}
      {hasItem ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/40 p-4">
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

      {/* Core fields --------------------------------------------------- */}
      <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
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

      {/*
        Payment id / transaction hash. Kept visible by design — this is
        the on-chain receipt the customer or merchant may need to look
        up later. The CopyButton is a small client subcomponent so the
        Receipt itself can stay free of hooks.
      */}
      {payment.paymentId ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/40 p-4">
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

      {/* Share / print row (client subcomponent, hidden when printing) */}
      {payment.receiptId ? (
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
