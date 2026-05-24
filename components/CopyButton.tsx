"use client";

/**
 * Base Point — `<CopyButton />`.
 *
 * Tiny client helper for copying a string to the clipboard with a brief
 * "Copied" confirmation. Used by `<PaymentQrCard />` for the checkout
 * link and by `<Receipt />` for the payment id / transaction hash.
 *
 * Pure presentational — no Base Pay, no storage, no network. Falls
 * back silently if `navigator.clipboard` is unavailable.
 */

import { useState } from "react";

interface Props {
  /** The string to copy. */
  value: string;
  /** Optional accessible label override (defaults to "Copy"). */
  label?: string;
  /** Visual size variant. `inline` is meant for use next to mono text. */
  size?: "sm" | "inline";
  /** Optional extra classes. */
  className?: string;
}

export function CopyButton({
  value,
  label = "Copy",
  size = "sm",
  className = "",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be blocked (insecure context, permissions
      // policy, etc.). The value is also visible on screen, so a silent
      // no-op is acceptable here.
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
      aria-label={copied ? "Copied" : label}
      className={`${base} ${sizing} ${className}`}
    >
      {copied ? (
        <>
          <CheckIcon />
          <span>Copied</span>
        </>
      ) : (
        <>
          <CopyIcon />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

function CopyIcon() {
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
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-emerald-300"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 8" />
    </svg>
  );
}
