/**
 * Base Point — USDC contract metadata for Base Sepolia.
 *
 * Single source of truth for the USDC token address and decimals on the
 * only network this app supports. The address comes from Circle's
 * official testnet documentation:
 *   https://developers.circle.com/stablecoins/usdc-contract-addresses
 *
 * Constraints (do not relax):
 *  - Base Sepolia only. Do not add mainnet USDC addresses here.
 *  - No balance reads, no transaction-history reads, no block-explorer
 *    or third-party indexer APIs. This file is purely contract metadata
 *    plus a small encoding helper for the wallet payment path.
 *  - Imports `viem` only for `parseUnits`. No wagmi or @base-org/account.
 */

import { parseUnits } from "viem";

/**
 * USDC contract address on Base Sepolia (Circle's testnet deployment).
 * Pinned with `as const` so the literal `0x…` type narrows correctly.
 */
export const USDC_ADDRESS_BASE_SEPOLIA =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

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
