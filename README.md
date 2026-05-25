# Base Point

> QR-style USDC checkout for merchants on Base mainnet.

Base Point lets a merchant create a payment request, share it as a QR code or
link, and let the customer pay in USDC with **Pay with Base** (one-tap, no
wallet popups) or any EVM wallet (MetaMask, Rabby, Coinbase Wallet, or any
WalletConnect-compatible wallet). The checkout polls on-chain status and
flips the receipt to *Completed* automatically once the transaction settles.

The app runs on **Base mainnet only** &mdash; **payments use real USDC**.

> **Mainnet mode uses real USDC.** Customers need USDC on Base. Wallet
> payments may require Base ETH for gas. Pay with Base is the simpler,
> one-tap path.

---

## Table of contents

1. [What is Base Point?](#what-is-base-point)
2. [Features](#features)
3. [Demo flow](#demo-flow)
4. [Tech stack](#tech-stack)
5. [Network and token details](#network-and-token-details)
6. [Builder Code attribution](#builder-code-attribution)
7. [Getting started](#getting-started)
8. [Environment variables](#environment-variables)
9. [Run locally](#run-locally)
10. [Safety constraints](#safety-constraints)
11. [Current limitations](#current-limitations)
12. [Roadmap](#roadmap)
13. [License](#license)

---

## What is Base Point?

Base Point is a lightweight, merchant-facing checkout for accepting USDC at
the point of sale on Base. The merchant creates a charge in seconds, shares a
public checkout link (or its QR code) with the customer, and the customer
pays in USDC with one tap.

The app is intentionally small:

- **No backend.** Payment requests are stored in `localStorage` for now, so
  each browser sees its own list of payments. A Supabase adapter is planned
  but not yet wired in.
- **No accounts.** There is no merchant sign-in.
- **No on-chain reads.** The app does not query balances, transaction
  history, or block explorers. It only writes (payment) and polls the SDK
  / on-chain receipt for the status of a payment it just initiated.
- **Mainnet only.** The network is hard-pinned to Base in code and asserted
  at module-load time. The Base Pay SDK is called with `testnet: false`.

The result is a small but realistic shape for a USDC point-of-sale flow that
a merchant could plug a real backend into later without rewriting the UI.

### Creating a payment request is offchain and gasless

Hitting **Create payment request** on the merchant side does *not* broadcast
a transaction. The request is written to `localStorage` and a checkout link
is generated. The customer-side **payment** is what consumes USDC and (for
the wallet path) Base ETH for gas.

---

## Features

- **Create a payment request** &mdash; recipient address, USDC amount, and
  an optional note (e.g. `Order #1234`). Offchain, gasless.
- **Public checkout page** with a QR code that the customer can scan with
  their phone camera to open the same checkout link.
- **Pay with Base** &mdash; one-tap USDC checkout via Coinbase&rsquo;s
  [`@base-org/account`](https://docs.base.org/) Base Pay SDK. No wallet
  popup, no chain switching. The simpler path.
- **Pay with Wallet** &mdash; standard EVM payment path for MetaMask, Rabby,
  Coinbase Wallet, and any WalletConnect-compatible wallet. Sends a USDC
  `transfer(...)` directly on Base mainnet. May require a small amount of
  Base ETH for gas.
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
   the USDC amount, and an optional note, then submits. This is offchain
   and free &mdash; no gas required.
2. **Share:** Base Point routes to `/pay/[id]`, which shows the amount, the
   recipient, a QR code, and a copyable checkout link.
3. **Scan:** the customer scans the QR with their phone camera (or the
   merchant simply opens the link on their device). The same checkout page
   loads.
4. **Pay:** the customer chooses **Pay with Base** for a one-tap experience,
   or **Pay with Wallet** to use any EVM wallet on Base mainnet. Real USDC
   is transferred.
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
lib/                basePay, network, usdc, builderCode, format, ids,
                    validators, wagmi
stores/             PaymentStore interface + localStorage adapter
types/              PaymentRequest and related types
```

---

## Network and token details

| Setting        | Value                                               |
| -------------- | --------------------------------------------------- |
| Chain          | Base &middot; Mainnet                               |
| Chain ID       | `8453`                                              |
| Token          | USDC (Circle&rsquo;s native deployment on Base)     |
| USDC contract  | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`        |
| Decimals       | `6`                                                 |
| Customer needs | USDC on Base. Wallet payments may also require a small amount of Base ETH for gas. |

These constants live in exactly two files and are not duplicated elsewhere
in the codebase:

- **Chain constants:** `lib/network.ts` (`CHAIN_ID = 8453`, `NETWORK_NAME =
  "base"`, `NETWORK_DISPLAY_NAME = "Base · Mainnet"`, `IS_TESTNET = false`,
  plus an `assertMainnetOnly()` runtime guard).
- **USDC token:** `lib/usdc.ts` (the contract address, decimals, and a
  `transfer`-only ABI fragment used by the wallet path).

---

## Builder Code attribution

Base Point participates in the [Base Builder Code](https://docs.base.org/)
programme so transactions can be credited back to this app.

- The Base app id `6a14a1f893151d66ddcd63e8` is exported from
  `lib/builderCode.ts` and rendered into `<head>` as a meta tag:

  ```html
  <meta name="base:app_id" content="6a14a1f893151d66ddcd63e8" />
  ```

  (the markup is generated by Next.js&rsquo;s `metadata.other` field in
  `app/layout.tsx`).

- **ERC-8021 dataSuffix transaction attribution is intentionally deferred**
  in this PR. Hand-appending a builder dataSuffix to the USDC `transfer(...)`
  calldata risks subtly breaking the wallet payment path, and viem/wagmi do
  not yet expose a clean integration point. The seam for enabling it later
  lives in `lib/builderCode.ts`; the meta tag is enough for now to declare
  the app to the Builder Code system without touching transaction calldata.

---

## Getting started

### Prerequisites

- **Node.js 20+** (Next.js 16 requires Node 18.18+; we recommend the latest
  LTS).
- **npm 10+** (or your preferred package manager &mdash; the lockfile is
  npm).
- A wallet on Base mainnet. To pay end-to-end via the wallet path, the
  customer needs **USDC on Base** for the payment and **a small amount of
  Base ETH** for gas. The Base Pay path is simpler &mdash; the customer
  only needs USDC.

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

1. Click **Create payment request**. Fill in your own Base wallet address,
   an amount (e.g. `1.00`), and an optional note. Submit. Creating the
   request is offchain and free.
2. On the resulting `/pay/[id]` page, scan the QR with your phone camera
   or copy the checkout link.
3. Choose **Pay with Base** for one-tap checkout, or **Pay with Wallet**
   to pay from any EVM wallet on Base. Mainnet mode uses real USDC.

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

| Rule                                                                   | How it is enforced                                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Mainnet only.** No testnet branch, no opaque chain switch.           | `lib/network.ts` exports `IS_TESTNET = false as const`, `CHAIN_ID = 8453 as const`, and an `assertMainnetOnly()` guard. Both Base Pay calls in `lib/basePay.ts` pass this flag. |
| **Base Pay SDK is fenced.** Only one file imports `@base-org/account`. | All Base Pay calls go through `lib/basePay.ts`. Pages and components import `startPayment` / `fetchPaymentStatus` from there. |
| **USDC contract address is fenced.**                                   | Defined exactly once in `lib/usdc.ts`. Nothing else hard-codes the address.                                       |
| **`localStorage` is fenced.** Only one file touches it.                | `window.localStorage` is read/written only inside `stores/localPaymentStore.ts`. UI code goes through the `PaymentStore` interface. |
| **Creating a payment request is offchain.**                            | `getPaymentStore().create(...)` writes to `localStorage` only; no transaction, no gas, no Base Pay call.          |
| **No balance reads.**                                                  | The `transfer`-only ABI in `lib/usdc.ts` has no `balanceOf`. No `useBalance`, `useReadContract`, or `getBalance` callsites exist. |
| **No transaction-history reads.**                                      | No `getLogs`, `watchEvent`, `useWatchContractEvent`, or any third-party indexer call.                              |
| **No block explorer / indexer APIs.**                                  | No code references Etherscan, Basescan, Alchemy, Infura, Moralis, or Covalent.                                    |
| **No Supabase yet.**                                                   | The `PaymentStore` interface is async on purpose so a Supabase adapter can drop in later, but no Supabase code ships today. |
| **No auth yet.**                                                       | There is no merchant sign-in. The dashboard is per-browser via `localStorage`.                                    |

---

## Current limitations

These are known and intentional today:

- **Per-browser storage.** Payment requests live in `localStorage`, so a
  request created in one browser is invisible to another. Sharing only the
  checkout link works for paying, but the merchant&rsquo;s dashboard view
  is local until a backend lands.
- **Polling, not webhooks.** Base Pay status is polled every 2 seconds for
  up to 90 seconds; after that, the UI surfaces a *still pending* hint and
  the user can refresh later. There is no server-side confirmation
  listener.
- **Mainnet only.** There is no testnet branch in the runtime. If you need
  a sandbox you should run a separate dedicated deployment that flips
  `IS_TESTNET` &mdash; we do not ship a runtime toggle.
- **No portfolio / history view.** The app does not show wallet balances or
  prior on-chain activity by design.
- **WalletConnect requires env.** WalletConnect is only available when
  `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set. Injected wallets (MetaMask,
  Rabby, EIP-6963 providers) and Coinbase Wallet always work.
- **Builder Code dataSuffix attribution is deferred.** Only the head-level
  `base:app_id` meta tag ships today; ERC-8021 calldata attribution is on
  the roadmap.

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
- **ERC-8021 dataSuffix Builder Code attribution** for the wallet payment
  path, once viem ships first-class support.

Out of scope and unlikely to land: wallet portfolio views, transaction
history, third-party indexer integrations.

---

## License

[MIT](./LICENSE) &copy; 2026 zalana28.
