"use client";

/**
 * Base Point — `<PrintButton />`.
 *
 * Tiny client helper that triggers the browser's print dialog. The
 * print stylesheet (see `app/globals.css`'s `@media print` block) is
 * what makes the printed page look like a clean receipt — this
 * component just calls `window.print()` and styles itself to match
 * the other small action buttons (CopyButton).
 *
 * No payment logic, no Base Pay, no storage — strictly UI.
 */

interface PrintButtonProps {
  /** Optional accessible label override (defaults to "Print receipt"). */
  label?: string;
  /** Visual size variant. Mirrors `<CopyButton />`'s API. */
  size?: "sm" | "inline";
  /** Optional extra classes. */
  className?: string;
}

export function PrintButton({
  label = "Print receipt",
  size = "sm",
  className = "",
}: PrintButtonProps) {
  function onClick() {
    if (typeof window === "undefined") return;
    try {
      window.print();
    } catch {
      // Print API may be blocked by extensions or sandboxed iframes;
      // a silent no-op is acceptable since the user can still File →
      // Print from the browser menu.
    }
  }

  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 font-medium text-slate-200 transition-colors hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60";
  const sizing =
    size === "inline" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`${base} ${sizing} ${className}`}
    >
      <PrinterIcon />
      <span>{label}</span>
    </button>
  );
}

function PrinterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M6 9V3h12v6" />
      <rect x="4" y="9" width="16" height="9" rx="2" />
      <rect x="7" y="14" width="10" height="6" rx="1" />
    </svg>
  );
}
