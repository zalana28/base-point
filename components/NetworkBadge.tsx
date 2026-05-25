import { CHAIN_ID, NETWORK_DISPLAY_NAME } from "@/lib/network";

/**
 * Persistent visual reminder of the network Base Point operates on.
 *
 * Now that the app runs on Base mainnet, the badge is rendered in an
 * emerald accent (a "live" indicator) rather than the previous amber
 * testnet warning. The label and tooltip read directly from
 * `lib/network.ts` so they cannot drift away from the values the SDK
 * actually uses.
 */
export function NetworkBadge() {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200 backdrop-blur-sm"
      title={`${NETWORK_DISPLAY_NAME} \u00b7 chain id ${CHAIN_ID}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 motion-reduce:hidden" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <span className="tracking-wide uppercase">{NETWORK_DISPLAY_NAME}</span>
    </span>
  );
}
