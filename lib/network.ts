/**
 * Base Point — network constants.
 *
 * Base Point now runs on **Base mainnet** only. The previous Base Sepolia
 * testnet support has been removed.
 *
 * SAFETY RULES (do not relax without an explicit product decision):
 * 1. The app supports Base mainnet ONLY (chain id 8453). There is no
 *    testnet branch; if you need a sandbox, build a separate dedicated
 *    deployment.
 * 2. `IS_TESTNET` MUST stay `false`. Every Base Pay call passes this
 *    flag, so flipping this constant is the only way the app could ever
 *    talk to a testnet — keep it pinned with `as const` so TypeScript
 *    narrows the literal type and any drift is caught at the type level.
 * 3. Do NOT add balance reads, transaction-history reads, or any
 *    third-party indexer (Etherscan / Basescan / etc.) here.
 */

export const CHAIN_ID = 8453 as const;
export const NETWORK_NAME = "base" as const;
/**
 * Human-friendly label used in UI copy (badges, error messages, network
 * pills, etc.). Kept separate from `NETWORK_NAME` (which is the wagmi
 * chain slug used for storage validation and transports) so display
 * text and code identifiers can evolve independently.
 */
export const NETWORK_DISPLAY_NAME = "Base \u00b7 Mainnet" as const;
export const IS_TESTNET = false as const;

export type SupportedChainId = typeof CHAIN_ID;
export type SupportedNetworkName = typeof NETWORK_NAME;

/**
 * Defensive runtime check used by the Base Pay wrapper. Catches the
 * (extremely unlikely) case where this module is tampered with at
 * runtime, e.g. someone sets `IS_TESTNET` to `true` to point Base Pay
 * back at a testnet.
 */
export function assertMainnetOnly(): void {
  if (IS_TESTNET !== false) {
    throw new Error(
      "Base Point: IS_TESTNET must be false. The app runs on Base mainnet only.",
    );
  }
  if (CHAIN_ID !== 8453) {
    throw new Error(
      `Base Point: only Base mainnet (8453) is supported. Got ${CHAIN_ID}.`,
    );
  }
}
