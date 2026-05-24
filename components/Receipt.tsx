/**
 * Base Point — `<Receipt />`.
 *
 * Presentational component summarising the lifecycle state of a payment
 * request: status badge, key timestamps, last error message (if any),
 * and a per-status human-readable line. Used by the public payment page.
 *
 * No hooks, no Base Pay calls, no storage access, no @base-org/account
 * import, no mainnet, no balance / tx-history / explorer / indexer.
 *
 * Note: this component does NOT initiate or poll payments. That belongs
 * to `<PayWithBaseButton />`, which lands in the next PR.
 */

import { formatDate, formatAmount } from "@/lib/format";
import type { PaymentRequest, PaymentRequestStatus } from "@/types/payment";

import { StatusBadge } from "./StatusBadge";

const STATUS_DESCRIPTION: Record<PaymentRequestStatus, string> = {
  pending: "Waiting for the customer to pay.",
  processing: "Payment submitted. Waiting for on-chain confirmation.",
  completed: "Payment confirmed on Base Sepolia.",
  failed: "The payment did not go through. The customer can try again.",
};

interface Props {
  payment: PaymentRequest;
}

export function Receipt({ payment }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Status</h2>
        <StatusBadge status={payment.status} />
      </div>

      <p className="mt-2 text-sm text-slate-600">
        {STATUS_DESCRIPTION[payment.status]}
      </p>

      {payment.errorMessage ? (
        <div
          role="alert"
          className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {payment.errorMessage}
        </div>
      ) : null}

      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Amount
          </dt>
          <dd className="mt-0.5 font-mono text-slate-900">
            {formatAmount(payment.amountUsdc)} USDC
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Created
          </dt>
          <dd className="mt-0.5 text-slate-900">
            {formatDate(payment.createdAt)}
          </dd>
        </div>
        {payment.submittedAt ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Submitted
            </dt>
            <dd className="mt-0.5 text-slate-900">
              {formatDate(payment.submittedAt)}
            </dd>
          </div>
        ) : null}
        {payment.settledAt ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Settled
            </dt>
            <dd className="mt-0.5 text-slate-900">
              {formatDate(payment.settledAt)}
            </dd>
          </div>
        ) : null}
        {payment.paymentId ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              {payment.paidVia === "wallet"
                ? "Transaction hash"
                : payment.paidVia === "base-pay"
                  ? "Base Pay payment id"
                  : "Payment id"}
            </dt>
            <dd
              className="mt-0.5 truncate font-mono text-xs text-slate-700"
              title={payment.paymentId}
            >
              {payment.paymentId}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
