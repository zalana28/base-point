/**
 * Base Point — network constants.
 *
 * SAFETY RULES (do not relax without an explicit product decision):
 * 1. The MVP supports Base Sepolia ONLY (chain id 84532).
 * 2. `IS_TESTNET` MUST stay `true`. Every Base Pay call passes this flag,
 *    so flipping this constant is the only way the app could ever talk to
 *    mainnet — keep it pinned with `as const` so TypeScript narrows the
 *    literal type and any drift is caught at the type level.
 * 3. Do NOT add Base mainnet support, balance reads, transaction-history
 *    reads, or any third-party indexer (Etherscan / Basescan / etc.) here.
 */

export const CHAIN_ID = 84532 as const;
export const NETWORK_NAME = "base-sepolia" as const;
export const IS_TESTNET = true as const;

export type SupportedChainId = typeof CHAIN_ID;
export type SupportedNetworkName = typeof NETWORK_NAME;

/**
 * Defensive runtime check used by the Base Pay wrapper. Catches the
 * (extremely unlikely) case where this module is tampered with at runtime.
 */
export function assertTestnetOnly(): void {
  if (IS_TESTNET !== true) {
    throw new Error(
      "Base Point: IS_TESTNET must be true. Mainnet is not supported in the MVP.",
    );
  }
  if (CHAIN_ID !== 84532) {
    throw new Error(
      `Base Point: only Base Sepolia (84532) is supported. Got ${CHAIN_ID}.`,
    );
  }
}
