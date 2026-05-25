/**
 * Base Point — pure form validators.
 *
 * Used by the /create form (and anywhere else we accept user input for
 * a payment request). Each validator returns either:
 *
 *   { ok: true, value }       — input accepted, normalised value attached
 *   { ok: false, message }    — input rejected, human-readable message
 *
 * NOTE: Address validation here is purely syntactic. The merchant is
 * responsible for entering the correct recipient address.
 *
 * No imports from `@base-org/account`, no network calls, no storage.
 */

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

/** EVM address: `0x` + 40 hex characters. */
export function validateAddress(
  input: string,
): ValidationResult<`0x${string}`> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, message: "Recipient address is required." };
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    return {
      ok: false,
      message: "Enter a valid 0x… address (40 hex characters).",
    };
  }
  return { ok: true, value: trimmed as `0x${string}` };
}

/**
 * USDC amount as a positive decimal string with at most 6 decimal places.
 *
 * Accepts: "1", "0.5", "10.50", "0.000001"
 * Rejects: "", "0", "0.0", "01", "1.2345678", "abc", "-1"
 *
 * Returns the cleaned string form so callers can hand it straight to the
 * storage layer (and ultimately to Base Pay) without touching `Number`.
 */
export function validateAmount(input: string): ValidationResult<string> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, message: "Amount is required." };
  }
  if (!/^(0|[1-9]\d*)(\.\d{1,6})?$/.test(trimmed)) {
    return {
      ok: false,
      message: "Enter a positive number with at most 6 decimal places.",
    };
  }
  // Reject zero ("0", "0.0", "0.000000") without relying on Number for
  // anything other than a comparison.
  if (Number(trimmed) <= 0) {
    return { ok: false, message: "Amount must be greater than zero." };
  }
  return { ok: true, value: trimmed };
}

/** Maximum length of the merchant's free-form note. */
export const NOTE_MAX_LENGTH = 140;

/** Free-form note. Empty is allowed; anything over `NOTE_MAX_LENGTH` is not. */
export function validateNote(input: string): ValidationResult<string> {
  if (input.length > NOTE_MAX_LENGTH) {
    return {
      ok: false,
      message: `Note must be ${NOTE_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: input };
}

/** Maximum length of the merchant's display name. */
export const MERCHANT_NAME_MAX_LENGTH = 80;

/** Required, trimmed merchant display name. */
export function validateMerchantName(
  input: string,
): ValidationResult<string> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, message: "Merchant name is required." };
  }
  if (trimmed.length > MERCHANT_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Merchant name must be ${MERCHANT_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: trimmed };
}

/** Maximum length of the item / service name. */
export const ITEM_NAME_MAX_LENGTH = 100;

/** Required, trimmed item / service name. */
export function validateItemName(input: string): ValidationResult<string> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, message: "Item or service name is required." };
  }
  if (trimmed.length > ITEM_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Item name must be ${ITEM_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: trimmed };
}

/** Largest quantity the form will accept. Generous; the MVP is offchain. */
export const QUANTITY_MAX = 9_999;

/**
 * Positive integer quantity, accepted as a string from a text input
 * and returned as a `number`. Rejects non-integers and zero so a
 * 0 × USDC bug can never reach the store.
 */
export function validateQuantity(input: string): ValidationResult<number> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, message: "Quantity is required." };
  }
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return {
      ok: false,
      message: "Quantity must be a whole number, 1 or more.",
    };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    return {
      ok: false,
      message: "Quantity must be a whole number, 1 or more.",
    };
  }
  if (n > QUANTITY_MAX) {
    return {
      ok: false,
      message: `Quantity must be ${QUANTITY_MAX.toLocaleString()} or fewer.`,
    };
  }
  return { ok: true, value: n };
}

/** Maximum length of the optional customer-facing label. */
export const CUSTOMER_LABEL_MAX_LENGTH = 80;

/**
 * Optional customer-facing label, e.g. "Table 5" or "Order #1234".
 * Empty string is allowed and normalised to an empty string here so
 * callers can pass it straight to the store (which treats `""` and
 * `undefined` interchangeably for optional fields).
 */
export function validateCustomerLabel(
  input: string,
): ValidationResult<string> {
  const trimmed = input.trim();
  if (trimmed.length > CUSTOMER_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      message: `Customer label must be ${CUSTOMER_LABEL_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: trimmed };
}
