/**
 * Base Point — receipt id generation.
 *
 * Receipt ids identify a payment in human-friendly form. They appear on
 * the public receipt URL (`/receipt/[id]`), in the merchant dashboard,
 * and on printed receipts that customers may keep.
 *
 * Format: `BP-YYYYMMDD-XXXX`
 *   - `BP`        : product prefix.
 *   - `YYYYMMDD`  : date in UTC, so receipt ids sort correctly in any
 *                   list view regardless of the merchant's locale.
 *   - `XXXX`      : 4 random alphanumeric characters drawn from a
 *                   reduced alphabet (no `0` / `O` / `1` / `I` / `L`),
 *                   so the code is easy to read out loud at a counter.
 *
 * No backend, no network calls. Pure, dependency-free.
 *
 * Constraints:
 *  - Receipt ids are NOT cryptographic identifiers. Do not rely on them
 *    for authentication. Their only job is to be a human-readable handle
 *    for a record we already pin by `id` (UUID).
 *  - Stable enough for the local MVP: the date prefix + 4 random chars
 *    yields ~1M combinations per day. Collisions inside one merchant's
 *    browser are vanishingly unlikely; the storage layer is free to
 *    treat them as opaque strings.
 */

/** Reduced alphabet for the random tail. No 0/O/1/I/L. */
const RECEIPT_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" as const;

const RECEIPT_RANDOM_LENGTH = 4 as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Pick `count` random characters from the receipt alphabet using
 * `crypto.getRandomValues` when available, falling back to `Math.random`
 * if the runtime somehow lacks it. Either way the value is just a
 * human-friendly tail, not a security token.
 */
function randomTail(count: number): string {
  const len = RECEIPT_ALPHABET.length;
  let out = "";
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const buf = new Uint32Array(count);
    crypto.getRandomValues(buf);
    for (let i = 0; i < count; i++) {
      out += RECEIPT_ALPHABET[buf[i] % len];
    }
    return out;
  }
  for (let i = 0; i < count; i++) {
    out += RECEIPT_ALPHABET[Math.floor(Math.random() * len)];
  }
  return out;
}

/**
 * Generate a fresh `BP-YYYYMMDD-XXXX` receipt id. Stable across calls
 * within the same millisecond (the random tail dominates).
 */
export function generateReceiptId(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = pad2(now.getUTCMonth() + 1);
  const d = pad2(now.getUTCDate());
  return `BP-${y}${m}${d}-${randomTail(RECEIPT_RANDOM_LENGTH)}`;
}

/**
 * Quick syntactic check used by the public receipt page when reading a
 * URL slug. Returns true for any string that looks like a receipt id
 * we could have generated; the actual record may or may not exist.
 *
 * Generous on case so receipt ids printed in lowercase still resolve.
 */
export function isReceiptIdLike(value: string): boolean {
  return /^BP-\d{8}-[A-Z2-9]{4}$/i.test(value);
}
