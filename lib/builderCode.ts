/**
 * Base Point — Builder Code (Base app id + ERC-8021 dataSuffix).
 *
 * Single source of truth for everything the app needs to be attributed
 * to the Base Builder Code programme:
 *
 *  1. `BASE_APP_ID` — the app id surfaced in the document head as a
 *     `<meta name="base:app_id" content="..." />` tag (see
 *     `app/layout.tsx`'s `metadata.other`).
 *
 *  2. `BUILDER_CODE` — the human-readable builder code shorthand. Not
 *     consumed onchain; included so the constants live next to each
 *     other and it stays greppable from a single place.
 *
 *  3. `BUILDER_CODE_DATA_SUFFIX` — the raw ERC-8021 dataSuffix used to
 *     attribute Base mainnet wallet transactions to this app.
 *     `<PayWithWalletButton />` appends this suffix to the encoded USDC
 *     `transfer(...)` calldata before sending the transaction.
 *
 * ERC-8021 attribution model
 * --------------------------
 * Solidity follows the ABI's "extra bytes are ignored at the call
 * boundary" rule: appending arbitrary bytes after a strictly-encoded
 * function call's arguments does not change the function's semantics
 * for compliant contracts. Circle's USDC on Base is one such contract,
 * so a `transfer(address,uint256)` call still executes exactly as
 * before — and indexers that scan calldata can recognise the trailing
 * suffix as an attribution marker.
 *
 * We deliberately attach the suffix only on the wallet path. The Base
 * Pay path (`<PayWithBaseButton />` -> `lib/basePay.ts`) is left
 * untouched — appending bytes to the SDK's userOp calldata is not a
 * supported integration point today, and we will revisit if/when the
 * Base Pay SDK exposes a first-class `dataSuffix` / `builderCode`
 * option.
 */

export const BASE_APP_ID = "6a14a1f893151d66ddcd63e8" as const;

export const BUILDER_CODE = "bc_9z49nydb" as const;

/**
 * ERC-8021 transaction attribution suffix for the Base Builder Code
 * programme. Appended (in raw hex) to the end of wallet USDC transfer
 * calldata.
 */
export const BUILDER_CODE_DATA_SUFFIX =
  "0x62635f397a34396e7964620b0080218021802180218021802180218021" as const;

/**
 * Append the ERC-8021 Builder Code suffix to an encoded transaction's
 * calldata.
 *
 * Behaviour:
 *  - If `data` is missing the `0x` prefix, returns it unchanged
 *    (defensive; viem's `encodeFunctionData` always returns `0x...`).
 *  - If the suffix is empty / not a valid `0x...` hex string, returns
 *    the original data unchanged. This makes the helper safe to call
 *    even if someone clears the constant during local experimentation.
 *  - If the data already ends with the suffix body, returns the
 *    original data unchanged so the helper is idempotent and won't
 *    double-append on retries.
 *
 * Returns a `0x${string}` so it slots back into viem / wagmi
 * transaction params without further casts.
 */
export function appendBuilderCodeSuffix(
  data: `0x${string}`,
): `0x${string}` {
  if (typeof data !== "string" || !data.startsWith("0x")) {
    return data;
  }

  const suffix = BUILDER_CODE_DATA_SUFFIX as string;
  if (
    !suffix ||
    !suffix.startsWith("0x") ||
    suffix.length <= 2 ||
    !/^[0-9a-fA-F]+$/.test(suffix.slice(2))
  ) {
    return data;
  }

  const suffixBody = suffix.slice(2).toLowerCase();
  const dataBody = data.slice(2).toLowerCase();

  // Idempotent: don't double-append if the suffix is already present
  // at the tail of the calldata.
  if (dataBody.endsWith(suffixBody)) {
    return data;
  }

  return `0x${data.slice(2)}${suffix.slice(2)}` as `0x${string}`;
}
