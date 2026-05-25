# Base Point

> QR-style USDC checkout for merchants on Base Sepolia.

Base Point lets a merchant create a payment request, share it as a QR code or
link, and let the customer pay in USDC with **Pay with Base** (one-tap, no
wallet popups) or any EVM wallet (MetaMask, Rabby, Coinbase Wallet, or any
WalletConnect-compatible wallet). The checkout polls on-chain status and
flips the receipt to *Completed* automatically once the transaction settles.

This is an MVP. Everything runs against **Base Sepolia testnet only** &mdash;
no mainnet payments are ever sent.

---

## Table of contents

1. [What is Base Point?](#what-is-base-point)
2. [Features](#features)
3. [Demo flow](#demo-flow)
4. [Tech stack](#tech-stack)
5. [Network and token details](#network-and-token-details)
6. [Getting started](#getting-started)
7. [Environment variables](#environment-variables)
8. [Run locally](#run-locally)
9. [Safety constraints](#safety-constraints)
10. [Current limitations](#current-limitations)
11. [Roadmap](#roadmap)
12. [License](#license)

---

## What is Base Point?

Base Point is a lightweight, merchant-facing checkout for accepting USDC at
the point of sale on Base. The merchant creates a charge in seconds, shares a
public checkout link (or its QR code) with the customer, and the customer
pays in USDC with one tap.

The MVP is intentionally small:

- **No backend.** Payment requests are stored in `localStorage` for now, so
  each browser sees its own list of payments. A Supabase adapter is planned
  but not yet wired in.
- **No accounts.** There is no merchant sign-in. The MVP is per-browser.
- **No on-chain reads.** The app does not query balances, transaction
  history, or block explorers. It only writes (payment) and polls the SDK
  for the status of a payment it just initiated.
- **Testnet only.** The network is hard-pinned to Base Sepolia in code and
  asserted at module-load time. Removing the testnet flag would require an
  intentional, single-file change.

The result is a small but realistic shape for a USDC point-of-sale flow that
a merchant could plug a real backend into later without rewriting the UI.

---

## Features

- **Create a payment request** &mdash; recipient address, USDC amount, and
  an optional note (e.g. `Order #1234`).
- **Public checkout page** with a QR code that the customer can scan with
  their phone camera to open the same checkout link.
- **Pay with Base** &mdash; one-tap USDC checkout via Coinbase&rsquo;s
  [`@base-org/account`](https://docs.base.org/) Base Pay SDK. No wallet
  popup, no chain switching.
- **Pay with Wallet** &mdash; standard EVM payment path for MetaMask, Rabby,
  Coinbase Wallet, and any WalletConnect-compatible wallet. Sends a USDC
  `transfer(...)` directly on Base Sepolia.
- **Live receipt** &mdash; status badge + per-status copy, timestamps for
  *created / submitted / settled*, and the on-chain identifier (Base Pay
  payment id or EVM transaction hash) with a copy-to-clipboard button.
- **Motion-safe success animation** that respects
  `prefers-reduced-motion`.
- **Local-only merchant dashboard** for listing payment requests created in
  the current browser. Will be replaced with a real backend later.

---

## Demo flow

1. **Create:** the merchant goes to `/create`, enters the recipient wallet,
   the USDC amount, and an optional note, then submits.
2. **Share:** Base Point routes to `/pay/[id]`, which shows the amount, the
   recipient, a QR code, and a copyable checkout link.
3. **Scan:** the customer scans the QR with their phone camera (or the
   merchant simply opens the link on their device). The same checkout page
   loads.
4. **Pay:** the customer chooses **Pay with Base** for a one-tap experience,
   or **Pay with Wallet** to use any EVM wallet on Base Sepolia.
5. **Settle:** Base Point polls the SDK / on-chain receipt. When a terminal
   status is reached, the receipt updates to *Completed* (or *Failed*) with
   the corresponding transaction identifier and timestamps.

---

## Tech stack

| Layer            | Choice                                                              |
| ---------------- | ------------------------------------------------------------------- |
| Framework        | [Next.js](https://nextjs.org/) 16 (App Router, Server + Client)     |
| Language         | TypeScript 5                                                        |
| Styling          | Tailwind CSS 4                                                      |
| Base Pay         | [`@base-org/account`](https://www.npmjs.com/package/@base-org/account) (fenced inside `lib/basePay.ts`) |
| Wallet path      | [wagmi](https://wagmi.sh/) + [viem](https://viem.sh/) + [`@tanstack/react-query`](https://tanstack.com/query) |
| QR rendering     | [`qrcode.react`](https://www.npmjs.com/package/qrcode.react)        |
| Storage (MVP)    | `window.localStorage`, fenced inside `stores/localPaymentStore.ts`  |
| Linting          | ESLint 9 + `eslint-config-next`                                     |

The repository has a small, deliberate file layout:

```
app/                Next.js App Router routes (/, /create, /pay/[id])
components/         Headless UI building blocks (server + client)
lib/                basePay, network, usdc, format, ids, validators, wagmi
stores/             PaymentStore interface + localStorage adapter
types/              PaymentRequest and related types
```

---

## Network and token details

| Setting        | Value                                               |
| -------------- | --------------------------------------------------- |
| Chain          | Base Sepolia                                        |
| Chain ID       | `84532`                                             |
| Token          | USDC (Circle&rsquo;s testnet deployment)            |
| USDC contract  | `0x036CbD53842c5426634e7929541eC2318f3dCF7e`        |
| Decimals       | `6`                                                 |
| Faucet         | Get test ETH and USDC from a Base Sepolia faucet, e.g. [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet) |

These constants live in exactly two files and are not duplicated elsewhere
in the codebase:

- **Chain constants:** `lib/network.ts` (`CHAIN_ID`, `NETWORK_NAME`,
  `IS_TESTNET`, plus an `assertTestnetOnly()` runtime guard).
- **USDC token:** `lib/usdc.ts` (the contract address, decimals, and a
  `transfer`-only ABI fragment used by the wallet path).

---

## Getting started

### Prerequisites

- **Node.js 20+** (Next.js 16 requires Node 18.18+; we recommend the latest
  LTS).
- **npm 10+** (or your preferred package manager &mdash; the lockfile is
  npm).
- A wallet on Base Sepolia funded with **a small amount of Sepolia ETH**
  (for gas) and **test USDC** to try the wallet path end-to-end. The Base
  Pay path also requires test USDC on the customer side.

### Clone and install

```bash
git clone https://github.com/zalana28/base-point.git
cd base-point
npm install
```

---

## Environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

| Variable                              | Required | Purpose                                                                                                          |
| ------------------------------------- | :------: | ---------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | No       | Enables the WalletConnect connector for mobile wallets (Rainbow, Trust, etc.). Get one from [Reown Cloud](https://cloud.reown.com/). If unset, the connector is simply omitted at build time and the injected / Coinbase Wallet connectors still work. |

There are **no required** environment variables. The Base Pay path and the
injected-wallet / Coinbase Wallet paths run with zero configuration.

> No keys for Etherscan, Basescan, Alchemy, Infura, Moralis, or Covalent are
> needed &mdash; or accepted. Base Point does not call any third-party
> indexer.

---

## Run locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and:

1. Click **Create payment request**.
2. Enter your own Base Sepolia wallet address, an amount (e.g. `1.50`), and
   an optional note. Submit.
3. On the resulting `/pay/[id]` page, scan the QR with your phone camera or
   copy the checkout link.
4. Choose **Pay with Base** or **Pay with Wallet** to complete the payment
   on Base Sepolia.

Other useful scripts:

```bash
npm run lint    # ESLint on the whole project
npm run build   # Production build (Next.js Turbopack)
npm run start   # Serve the production build
```

---

## Safety constraints

Base Point treats safety as a code-level invariant, not a code review TODO.
The following constraints are enforced by file structure and short
greppable seams:

| Rule                                                                  | How it is enforced                                                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Testnet only.** The app must never talk to Base mainnet.            | `lib/network.ts` exports `IS_TESTNET = true as const` and an `assertTestnetOnly()` guard. Every Base Pay call passes this flag. |
| **Base Pay SDK is fenced.** Only one file imports `@base-org/account`. | All Base Pay calls go through `lib/basePay.ts`. Pages and components import `startPayment` / `fetchPaymentStatus` from there. |
| **USDC contract address is fenced.**                                  | Defined exactly once in `lib/usdc.ts`. Nothing else hard-codes the address.                                       |
| **`localStorage` is fenced.** Only one file touches it.               | `window.localStorage` is read/written only inside `stores/localPaymentStore.ts`. UI code goes through the `PaymentStore` interface. |
| **No balance reads.**                                                 | The `transfer`-only ABI in `lib/usdc.ts` has no `balanceOf`. No `useBalance`, `useReadContract`, or `getBalance` callsites exist. |
| **No transaction-history reads.**                                     | No `getLogs`, `watchEvent`, `useWatchContractEvent`, or any third-party indexer call.                              |
| **No block explorer / indexer APIs.**                                 | No code references Etherscan, Basescan, Alchemy, Infura, Moralis, or Covalent.                                    |
| **No Supabase yet.**                                                  | The `PaymentStore` interface is async on purpose so a Supabase adapter can drop in later, but no Supabase code ships today. |
| **No auth yet.**                                                      | There is no merchant sign-in. The dashboard is per-browser via `localStorage`.                                    |

These rules are also asserted with simple `grep`-friendly invariants
documented in `AGENTS.md`.

---

## Current limitations

These are known and intentional in the MVP:

- **Per-browser storage.** Payment requests live in `localStorage`, so a
  request created in one browser is invisible to another. Sharing only the
  checkout link works for paying, but the merchant&rsquo;s dashboard view
  is local until a backend lands.
- **Polling, not webhooks.** Base Pay status is polled every 2 seconds for
  up to 90 seconds; after that, the UI surfaces a *still pending* hint and
  the user can refresh later. There is no server-side confirmation
  listener.
- **No mainnet path.** Removing testnet support would require an explicit,
  reviewed change to `lib/network.ts` and `lib/basePay.ts`. The MVP does
  not provide a mainnet toggle.
- **No portfolio / history view.** The app does not show wallet balances or
  prior on-chain activity by design.
- **Wallet support depends on env.** WalletConnect is only available when
  `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set. Injected wallets
  (MetaMask, Rabby, EIP-6963 providers) and Coinbase Wallet always work.

---

## Roadmap

Loose, in priority order. Nothing here is committed to a date.

- **Supabase adapter for `PaymentStore`** so payment requests survive across
  devices and merchants.
- **Sign in with Base** for merchant authentication, scoping the dashboard
  per-merchant rather than per-browser.
- **Server-side confirmation webhook** so receipts stay accurate even when
  the customer closes the page mid-confirmation.
- **CSV export from the dashboard.**
- **Optional, env-flagged mainnet support** &mdash; off by default, with the
  same fences in place.

Out of scope and unlikely to land: wallet portfolio views, transaction
history, third-party indexer integrations.

---

## License

[MIT](./LICENSE) &copy; 2026 zalana28.
