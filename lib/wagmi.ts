/**
 * Base Point — wagmi config (wallet payment path).
 *
 * Sets up wagmi for the "Pay with Wallet" flow. Used by Web3Provider and
 * by PayWithWalletButton. NOT used by the Base Pay flow — that path goes
 * through `lib/basePay.ts` and the @base-org/account SDK.
 *
 * Connectors:
 *  - `injected` — picks up MetaMask, Rabby, and any other browser wallet
 *    that exposes EIP-1193 / EIP-6963.
 *  - `coinbaseWallet` — Coinbase Wallet (browser extension and mobile).
 *  - `walletConnect` — included only when
 *    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set in the env. The
 *    connector requires a project id from https://cloud.reown.com/, so
 *    we skip it in builds without one rather than crash.
 *
 * Constraints (do not relax):
 *  - Base mainnet ONLY. The `chains` array contains exactly one entry.
 *  - No balance reads, no transaction-history reads, no block-explorer
 *    or third-party indexer APIs.
 *  - Does NOT import @base-org/account. The Base Pay path is fenced
 *    inside lib/basePay.ts.
 */

import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

import { CHAIN_ID } from "./network";

// Belt-and-braces: wagmi's `base` chain id must match our pinned
// CHAIN_ID. If wagmi ever ships with a wrong chain id (or if our
// constant drifts) this throws at module load time, which is loud.
if (base.id !== CHAIN_ID) {
  throw new Error(
    `Base Point: wagmi base.id (${base.id}) does not match CHAIN_ID (${CHAIN_ID}).`,
  );
}

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: "Base Point" }),
  ...(wcProjectId
    ? [walletConnect({ projectId: wcProjectId, showQrModal: true })]
    : []),
];

/**
 * The single wagmi config used by Web3Provider. `ssr: true` defers
 * connection state hydration to the client so Next.js's server render
 * doesn't try to read from `window.localStorage`.
 */
export const wagmiConfig = createConfig({
  chains: [base],
  connectors,
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});
