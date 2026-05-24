import type { PaymentRequestStatus } from "@/types/payment";

/**
 * Map of internal `PaymentRequestStatus` values to their visual style.
 *
 * Using a `Record<PaymentRequestStatus, ...>` ensures TypeScript catches
 * any new status added to the union without a corresponding badge style.
 */
const STYLES: Record<
  PaymentRequestStatus,
  { label: string; classes: string; dot: string }
> = {
  pending: {
    label: "Pending",
    classes: "border-white/10 bg-white/5 text-slate-300",
    dot: "bg-slate-400",
  },
  processing: {
    label: "Processing",
    classes: "border-blue-400/30 bg-blue-500/10 text-blue-200",
    dot: "bg-blue-400 animate-pulse motion-reduce:animate-none",
  },
  completed: {
    label: "Completed",
    classes: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    dot: "bg-emerald-400",
  },
  failed: {
    label: "Failed",
    classes: "border-rose-400/30 bg-rose-500/10 text-rose-200",
    dot: "bg-rose-400",
  },
};

/**
 * Coloured pill summarising the current lifecycle state of a payment
 * request. The colour mapping is local to this component — pages and
 * other components must not redefine status styles.
 */
export function StatusBadge({ status }: { status: PaymentRequestStatus }) {
  const { label, classes, dot } = STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${dot}`}
      />
      {label}
    </span>
  );
}
