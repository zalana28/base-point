/**
 * Base Point — USDC contract metadata for Base mainnet.
 *
 * Single source of truth for the USDC token address and decimals on the
 * only network this app supports. The address is Circle's official
 * native USDC deployment on Base mainnet:
 *   https://developers.circle.com/stablecoins/usdc-contract-addresses
 *
 * Constraints (do not relax):
 *  - Base mainnet only. Do not add additional USDC addresses here.
 *  - No balance reads, no transaction-history reads, no block-explorer
 *    or third-party indexer APIs. This file is purely contract metadata
 *    plus a small encoding helper for the wallet payment path.
 *  - Imports `viem` only for `parseUnits`. No wagmi or @base-org/account.
 */

import { parseUnits } from "viem";

/**
 * USDC contract address on Base mainnet (Circle's native deployment).
 * Pinned with `as const` so the literal `0x…` type narrows correctly.
 */
export const USDC_ADDRESS_BASE =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

/** USDC has 6 decimal places on every chain. */
export const USDC_DECIMALS = 6 as const;

/**
 * Minimal ERC-20 transfer ABI fragment.
 *
 * We only declare `transfer` here. We deliberately do NOT include any
 * read functions (balanceOf, allowance, etc.) — there are no balance
 * reads in Base Point.
 */
export const USDC_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/**
 * Convert a decimal USDC string (e.g. "10.50") to its base-units bigint
 * (uint256) form, ready to pass to `transfer(...)`. Uses viem's
 * `parseUnits` so we never touch JavaScript floats.
 */
export function toUsdcUnits(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS);
}
