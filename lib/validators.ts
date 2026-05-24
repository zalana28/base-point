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
