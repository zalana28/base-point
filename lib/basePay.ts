/**
 * Base Point — Base Pay wrapper.
 *
 * This is the ONLY module in the codebase that is allowed to import from
 * `@base-org/account`. Everything else in the app (pages, components,
 * stores) must import `startPayment` / `fetchPaymentStatus` from here.
 *
 * Why this restriction exists:
 *  - Centralises `testnet: IS_TESTNET` so it cannot drift across pages.
 *  - Keeps the SDK surface a single, auditable seam if we ever upgrade
 *    or replace the payments provider.
 *  - Makes safety greps (`grep "@base-org/account"`) trivially short.
 *
 * The MVP is strictly Base Sepolia. Do not add mainnet branches, do not
 * add balance lookups, do not add transaction-history lookups, and do not
 * call any block-explorer or third-party indexer API here.
 */

import {
  pay,
  getPaymentStatus,
  type PaymentSuccess,
  type PaymentStatus as SdkPaymentStatus,
  type PaymentStatusType,
} from "@base-org/account";

import { IS_TESTNET, assertTestnetOnly } from "./network";

// Re-export SDK types so the rest of the app never has to import from
// `@base-org/account` directly. Renamed to make their origin obvious at
// the call sites.
export type BasePayPaymentResult = PaymentSuccess;
export type BasePayStatus = SdkPaymentStatus;
export type BasePayStatusType = PaymentStatusType;

export interface StartPaymentArgs {
  /** USDC amount as a decimal string, e.g. "10.50". */
  amount: string;
  /** Recipient EVM address. */
  to: `0x${string}`;
}

/**
 * Initiate a USDC payment on Base Sepolia via Base Pay.
 *
 * Always passes `testnet: IS_TESTNET` (which is `true` in the MVP).
 * Resolves with the SDK's `PaymentSuccess` shape; rejects on user-cancel
 * or transport errors — callers should surface the error message.
 */
export async function startPayment(
  args: StartPaymentArgs,
): Promise<BasePayPaymentResult> {
  assertTestnetOnly();
  return pay({
    amount: args.amount,
    to: args.to,
    testnet: IS_TESTNET,
  });
}

/**
 * Poll the on-chain status of a previously initiated payment.
 *
 * The SDK returns one of: `pending` | `completed` | `failed` | `not_found`.
 * Callers translate that into our internal `PaymentRequestStatus`
 * (see `types/payment.ts`).
 */
export async function fetchPaymentStatus(
  paymentId: string,
): Promise<BasePayStatus> {
  assertTestnetOnly();
  return getPaymentStatus({
    id: paymentId,
    testnet: IS_TESTNET,
  });
}
