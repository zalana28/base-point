import { CHAIN_ID } from "@/lib/network";

/**
 * Persistent visual reminder that Base Point only operates on Base
 * Sepolia testnet. Rendered in the header on every page.
 *
 * Reads `CHAIN_ID` from `lib/network.ts` so the tooltip cannot drift
 * away from the value the SDK actually uses.
 */
export function TestnetBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200"
      title={`Base Sepolia · chain id ${CHAIN_ID}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-amber-500"
        aria-hidden="true"
      />
      Base Sepolia · Testnet
    </span>
  );
}
