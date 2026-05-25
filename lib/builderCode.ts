/**
 * Base Point — Builder Code (Base app id).
 *
 * Single source of truth for the Base app id used by the Builder Code
 * programme. The same value is rendered into the document head as a
 * `<meta name="base:app_id" content="..." />` tag (see
 * `app/layout.tsx`'s `metadata.other`), so changing the constant here
 * propagates to the meta tag automatically.
 *
 * Why this lives in its own module:
 *  - Keeps the id literal greppable from a single place.
 *  - Lets future onchain attribution (see TODO below) import the same
 *    constant without pulling in unrelated infrastructure.
 *
 * TODO (deferred): ERC-8021 dataSuffix transaction attribution.
 *
 *   The Base Builder Code programme can credit transactions back to a
 *   specific app via a `dataSuffix` appended to the transaction
 *   calldata (see ERC-8021 / Base Builder docs). Wagmi/viem do not yet
 *   expose a clean, typed integration point for appending a
 *   `dataSuffix` to `writeContract(...)` calldata, and hand-encoding
 *   the call data ourselves would risk subtly breaking the USDC
 *   `transfer(...)` we send on the wallet path.
 *
 *   Decision for this PR: ship the builder id only as a head-level
 *   meta tag. Do NOT manually append builder attribution to USDC
 *   transfer calldata. Revisit once viem ships first-class support
 *   (or once we are confident in a hand-rolled encoder + tests).
 *
 *   When we do enable it, this is the seam to use:
 *     - export an `appendBuilderDataSuffix(data: Hex): Hex` here, and
 *     - add a single call site inside the wallet payment path.
 *   Keeping the seam small preserves the "USDC transfer is not broken
 *   by attribution" guarantee.
 */

export const BASE_APP_ID = "6a14a1f893151d66ddcd63e8" as const;
