/**
 * Base Point — internal data model for payment requests.
 *
 * These types describe records owned by Base Point itself (stored in the
 * MVP via `localStorage`, later swappable for Supabase). They are NOT the
 * same as the Base Pay SDK's payment-status type — see `lib/basePay.ts`
 * for that.
 *
 * MVP constraints reflected here:
 *  - `network` is fixed to `"base-sepolia"`.
 *  - `chainId` is fixed to `84532`.
 *  - There is no field for mainnet, balances, or external explorer data.
 */

import type { CHAIN_ID, NETWORK_NAME } from "@/lib/network";

/**
 * Lifecycle of a Base Point payment request.
 *
 * Distinct from the SDK's `PaymentStatusType` (`pending | completed |
 * failed | not_found`). Translation rules used by the public payment page:
 *
 *   SDK `not_found`  -> internal `processing` (transaction not yet visible)
 *   SDK `pending`    -> internal `processing` (submitted, awaiting confirm)
 *   SDK `completed`  -> internal `completed`
 *   SDK `failed`     -> internal `failed`
 */
export type PaymentRequestStatus =
  | "pending" // created, customer has not yet paid
  | "processing" // pay() submitted, awaiting on-chain confirmation
  | "completed" // confirmed on-chain
  | "failed"; // user cancelled or chain reported failure

export interface PaymentRequest {
  /** Local UUID, used as the slug in /pay/[id]. */
  id: string;

  /** Merchant wallet that should receive the USDC. */
  recipient: `0x${string}`;

  /**
   * USDC amount as a decimal string (e.g. "10.50"). Stored as a string to
   * avoid float drift; this is also the format the Base Pay SDK accepts.
   */
  amountUsdc: string;

  /** Free-form merchant note. May be the empty string. */
  note: string;

  /** Current lifecycle state of this request. */
  status: PaymentRequestStatus;

  /**
   * On-chain identifier for the payment.
   *  - For the Base Pay path: the userOp hash returned by `pay()`.
   *  - For the wallet path: the EVM transaction hash returned by
   *    `writeContract(...transfer)`.
   *
   * `paidVia` (below) tells you which path was used.
   */
  paymentId?: string;

  /**
   * Which payment path was used to settle this request. Set on the
   * optimistic write that flips the record to `processing`.
   */
  paidVia?: "base-pay" | "wallet";

  /** Last error message surfaced to the customer, if any. */
  errorMessage?: string;

  /** Network metadata — pinned to Base Sepolia in the MVP. */
  network: typeof NETWORK_NAME;
  chainId: typeof CHAIN_ID;

  /** Epoch ms; when the request was created. */
  createdAt: number;
  /** Epoch ms; when `pay()` first resolved. */
  submittedAt?: number;
  /** Epoch ms; when a terminal status was reached. */
  settledAt?: number;
}

/**
 * Shape accepted by `PaymentStore.create`. The store fills in `id`,
 * `status`, `createdAt`, `network`, and `chainId` itself so callers can't
 * accidentally tag a record with the wrong network.
 */
export type CreatePaymentRequestInput = Pick<
  PaymentRequest,
  "recipient" | "amountUsdc" | "note"
>;
