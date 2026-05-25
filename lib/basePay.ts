/**
 * Base Point — Base Pay wrapper.
 *
 * This is the ONLY module in the codebase that is allowed to import from
 * `@base-org/account`. Everything else in the app (pages, components,
 * stores) must import `startPayment` / `fetchPaymentStatus` from here.
 *
 * Why this restriction exists:
 *  - Centralises `testnet: IS_TESTNET` so it cannot drift across pages.
 *    Both `pay()` and `getPaymentStatus()` MUST receive the same value
 *    for the testnet flag — otherwise we would submit on mainnet but
 *    poll on testnet (or vice versa) and the receipt would never settle.
 *  - Keeps the SDK surface a single, auditable seam if we ever upgrade
 *    or replace the payments provider.
 *  - Makes safety greps (`grep "@base-org/account"`) trivially short.
 *
 * The app runs on Base mainnet only. `IS_TESTNET` is `false`; both Base
 * Pay calls pass that flag verbatim, and `assertMainnetOnly()` runs
 * before each call to catch any accidental drift at runtime.
 */

import {
  pay,
  getPaymentStatus,
  type PaymentSuccess,
  type PaymentStatus as SdkPaymentStatus,
  type PaymentStatusType,
} from "@base-org/account";

import { IS_TESTNET, assertMainnetOnly } from "./network";

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
 * Initiate a USDC payment on Base mainnet via Base Pay.
 *
 * Always passes `testnet: IS_TESTNET` (which is `false` on mainnet).
 * Resolves with the SDK's `PaymentSuccess` shape; rejects on user-cancel
 * or transport errors — callers should surface the error message.
 */
export async function startPayment(
  args: StartPaymentArgs,
): Promise<BasePayPaymentResult> {
  assertMainnetOnly();
  return pay({
    amount: args.amount,
    to: args.to,
    testnet: IS_TESTNET,
  });
}

/**
 * Poll the on-chain status of a previously initiated payment.
 *
 * MUST use the same `testnet:` value as `startPayment` above —
 * otherwise the SDK would look up the payment on the wrong network.
 * Callers translate the returned status into our internal
 * `PaymentRequestStatus` (see `types/payment.ts`).
 */
export async function fetchPaymentStatus(
  paymentId: string,
): Promise<BasePayStatus> {
  assertMainnetOnly();
  return getPaymentStatus({
    id: paymentId,
    testnet: IS_TESTNET,
  });
}
