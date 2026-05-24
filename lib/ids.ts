/**
 * Base Point — id generation.
 *
 * Centralised so the storage layer (and anything else that needs a stable
 * id) does not embed its own UUID logic. Pure, no Base Pay or storage
 * dependencies.
 */

/**
 * Generate a new payment-request id.
 *
 * Prefers `crypto.randomUUID()` (available in modern browsers and Node
 * 22+, which is what we target). Falls back to a non-collision-prone but
 * still unique-enough string if the runtime somehow lacks it.
 */
export function newPaymentId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `pmt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
