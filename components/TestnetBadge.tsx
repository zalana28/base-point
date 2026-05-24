import { CHAIN_ID } from "@/lib/network";

/**
 * Persistent visual reminder that Base Point only operates on Base
 * Sepolia testnet. Rendered in the header on every page and inline on
 * marketing/checkout surfaces.
 *
 * Reads `CHAIN_ID` from `lib/network.ts` so the tooltip cannot drift
 * away from the value the SDK actually uses.
 */
export function TestnetBadge() {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200 backdrop-blur-sm"
      title={`Base Sepolia · chain id ${CHAIN_ID}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300/60 motion-reduce:hidden" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
      </span>
      <span className="tracking-wide uppercase">Base Sepolia · Testnet</span>
    </span>
  );
}
