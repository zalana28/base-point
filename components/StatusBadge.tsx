import type { PaymentRequestStatus } from "@/types/payment";

/**
 * Map of internal `PaymentRequestStatus` values to their visual style.
 *
 * Using a `Record<PaymentRequestStatus, ...>` ensures TypeScript catches
 * any new status added to the union without a corresponding badge style.
 */
const STYLES: Record<
  PaymentRequestStatus,
  { label: string; classes: string }
> = {
  pending: {
    label: "Pending",
    classes: "bg-slate-100 text-slate-800 ring-slate-200",
  },
  processing: {
    label: "Processing",
    classes: "bg-blue-100 text-blue-800 ring-blue-200",
  },
  completed: {
    label: "Completed",
    classes: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  },
  failed: {
    label: "Failed",
    classes: "bg-rose-100 text-rose-800 ring-rose-200",
  },
};

/**
 * Coloured pill summarising the current lifecycle state of a payment
 * request. The colour mapping is local to this component — pages and
 * other components must not redefine status styles.
 */
export function StatusBadge({ status }: { status: PaymentRequestStatus }) {
  const { label, classes } = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      {label}
    </span>
  );
}
