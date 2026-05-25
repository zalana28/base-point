/**
 * Base Point — payment-request storage interface.
 *
 * Defines the contract that pages and components use to read/write
 * payment-request records. The MVP returns a `localStorage`-backed
 * implementation; a Supabase adapter will replace it later without
 * changing this interface or any call site.
 *
 * All methods are `async` on purpose so the future Supabase adapter is
 * a drop-in replacement.
 */

import type {
  CreatePaymentRequestInput,
  PaymentRequest,
} from "@/types/payment";

import { localPaymentStore } from "./localPaymentStore";

/**
 * Fields that cannot be modified after a record is created. Identity
 * (`id`, `createdAt`) and network metadata (`network`, `chainId`) have
 * always been pinned. Receipt-side metadata (`receiptId`, line items,
 * customer label) is also pinned at create time so the public receipt
 * URL can never silently change out from under a customer.
 */
type ImmutablePaymentField =
  | "id"
  | "createdAt"
  | "network"
  | "chainId"
  | "receiptId"
  | "merchantName"
  | "itemName"
  | "quantity"
  | "unitPriceUsdc"
  | "customerLabel";

export type PaymentPatch = Partial<
  Omit<PaymentRequest, ImmutablePaymentField>
>;

export interface PaymentStore {
  /** Return every record, newest first. */
  list(): Promise<PaymentRequest[]>;

  /** Return one record by id, or `null` if it does not exist. */
  getById(id: string): Promise<PaymentRequest | null>;

  /**
   * Return one record by its receipt id, or `null` if no record has
   * that receipt id (or the record predates the receipt-id feature).
   * Receipt id matching is case-insensitive.
   */
  getByReceiptId(receiptId: string): Promise<PaymentRequest | null>;

  /**
   * Persist a new record. The store fills in `id`, `receiptId`,
   * `status`, `createdAt`, `network`, and `chainId` itself so callers
   * cannot tag a record with the wrong network or spoof a receipt id.
   */
  create(input: CreatePaymentRequestInput): Promise<PaymentRequest>;

  /**
   * Apply a partial patch to an existing record.
   *
   * Identity, network metadata, and receipt-side metadata are pinned
   * at creation time and cannot be patched — the type signature blocks
   * them, and the implementation re-asserts the existing values
   * defensively. See `PaymentPatch`.
   */
  update(id: string, patch: PaymentPatch): Promise<PaymentRequest>;

  /**
   * Delete every record. Intended for development / "reset" only.
   * Pages must NOT call this in normal user flows.
   */
  clear(): Promise<void>;
}

/**
 * Return the active store instance.
 *
 * Today this is the `localStorage`-backed implementation. When Supabase
 * lands, this factory will pick the right adapter based on env config
 * — but the public interface above must not change.
 */
export function getPaymentStore(): PaymentStore {
  return localPaymentStore;
}
