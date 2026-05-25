"use client";

/**
 * Base Point — `<ReceiptShareRowInner />`.
 *
 * Tiny client-only sibling of `<Receipt />`. Owns the action row at
 * the bottom of the receipt: copy receipt link + print. Lives in its
 * own file so `Receipt.tsx` can stay free of `"use client"` and run
 * on either side of the boundary.
 *
 * Reads the receipt URL via `useSyncExternalStore` so the SSR render
 * sees `null`, the client render sees the real origin, and React
 * doesn't trip over a hydration mismatch. The same pattern is used
 * in `<PaymentQrCard />` for the same reason.
 */

import { useSyncExternalStore } from "react";

import { CopyButton } from "@/components/CopyButton";
import { PrintButton } from "@/components/PrintButton";

const SUBSCRIBE_NOOP = () => () => {};
const getOrigin = (): string | null =>
  typeof window === "undefined" ? null : window.location.origin;
const getServerOrigin = (): string | null => null;

interface Props {
  receiptId: string;
}

export function ReceiptShareRowInner({ receiptId }: Props) {
  const origin = useSyncExternalStore(
    SUBSCRIBE_NOOP,
    getOrigin,
    getServerOrigin,
  );

  const url = origin ? `${origin}/receipt/${receiptId}` : "";

  return (
    <div className="bp-no-print mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
      <p className="text-[11px] text-slate-500">
        Share or print this receipt with the customer.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton value={url} label="Copy receipt link" />
        <PrintButton />
      </div>
    </div>
  );
}
