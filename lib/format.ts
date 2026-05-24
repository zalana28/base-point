/**
 * Base Point — display formatting helpers.
 *
 * Pure, dependency-free. Nothing in here calls Base Pay, storage, or
 * the network — these are presentational only.
 */

/**
 * Truncate an EVM address for display, e.g. `0x1234…abcd`.
 *
 * Returns the input unchanged if it is shorter than the truncation
 * window, so it is safe to call on any string.
 */
export function truncateAddress(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/**
 * Format a USDC amount string for display.
 *
 * Operates on the canonical decimal-string form we store (e.g. "10.50")
 * to avoid any floating-point conversion. Pads decimals to at least 2
 * places and trims trailing zeros beyond that:
 *
 *   "10"        -> "10.00"
 *   "10.5"      -> "10.50"
 *   "10.1000"   -> "10.10"
 *   "10.123456" -> "10.123456"
 *
 * If the input is not a clean numeric string we return it unchanged
 * rather than throwing — this is presentation, not validation.
 */
export function formatAmount(amount: string): string {
  if (!/^-?\d+(\.\d+)?$/.test(amount)) return amount;
  const [intPart, decPart = ""] = amount.split(".");
  const trimmed = decPart.replace(/0+$/, "");
  const padded = trimmed.length < 2 ? trimmed.padEnd(2, "0") : trimmed;
  return `${intPart}.${padded}`;
}

/**
 * Format an epoch-ms timestamp as a short locale-aware string.
 */
export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleString();
}
