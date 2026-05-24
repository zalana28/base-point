import { formatDate, formatAmount } from "@/lib/format";
import type { PaymentRequest, PaymentRequestStatus } from "@/types/payment";

import { StatusBadge } from "./StatusBadge";

const STATUS_DESCRIPTION: Record<PaymentRequestStatus, string> = {
  pending: "Waiting for the customer to pay.",
  processing: "Payment submitted. Waiting for on-chain confirmation.",
  completed: "Payment confirmed on Base Sepolia.",
  failed: "The payment did not go through. The customer can try again.",
};

export function Receipt({ payment }: { payment: PaymentRequest }) {
  const stateStyles: Record<PaymentRequestStatus, string> = {
    pending: "border-slate-200",
    processing: "border-blue-200 bg-blue-50/30",
    completed: "border-emerald-200 bg-emerald-50/40",
    failed: "border-rose-200 bg-rose-50/40",
  };

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${stateStyles[payment.status]}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Payment status</h2>
        <div className={payment.status === "completed" ? "animate-pulse" : ""}>
          <StatusBadge status={payment.status} />
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-600">{STATUS_DESCRIPTION[payment.status]}</p>

      {payment.errorMessage ? (
        <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {payment.errorMessage}
        </div>
      ) : null}

      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Amount</dt><dd className="mt-0.5 font-mono text-slate-900">{formatAmount(payment.amountUsdc)} USDC</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Created</dt><dd className="mt-0.5 text-slate-900">{formatDate(payment.createdAt)}</dd></div>
        {payment.submittedAt ? <div><dt className="text-xs uppercase tracking-wide text-slate-500">Submitted</dt><dd className="mt-0.5 text-slate-900">{formatDate(payment.submittedAt)}</dd></div> : null}
        {payment.settledAt ? <div><dt className="text-xs uppercase tracking-wide text-slate-500">Settled</dt><dd className="mt-0.5 text-slate-900">{formatDate(payment.settledAt)}</dd></div> : null}
      </dl>
    </div>
  );
}
