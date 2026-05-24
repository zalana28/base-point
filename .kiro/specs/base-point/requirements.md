# Base Point — Requirements

## 1. Product summary

Base Point is a QR-style USDC checkout app for merchants on Base. A merchant
creates a payment request with a wallet address, an amount in USDC, and a note.
The app generates a shareable QR code that points to a public payment page.
A customer opens that page, taps "Pay with Base", and sends USDC to the
merchant using the Base Pay SDK on Base Sepolia.

This document captures the MVP scope only. Anything not listed under
"In scope" is explicitly deferred.

## 2. In scope (MVP)

- Testnet-only checkout on Base Sepolia (chain id `84532`).
- Create, list, and view payment requests using an internal data model.
- Local/mock storage (browser `localStorage`) as the only persistence layer
  for the MVP. The storage layer must be behind an interface so a Supabase
  adapter can be dropped in later without changing call sites.
- Four pages, all using the Next.js App Router:
  1. `/` — landing page.
  2. `/create` — merchant creates a new payment request.
  3. `/pay/[id]` — public payment page consumed by the customer.
  4. `/dashboard` — merchant dashboard listing payment requests.
- QR code generation for the public payment URL using `qrcode.react`.
- Base Pay integration via `@base-org/account` with `testnet: true` for both
  `pay` and `getPaymentStatus`.
- Receipt UI showing success or pending state after payment is initiated.

## 3. Out of scope (explicitly excluded for the MVP)

- Base mainnet. The app must refuse to run against mainnet.
- Wallet trackers, balance lookups, or "wallet portfolio" features.
- Transaction history fetched from any external indexer.
- Etherscan / Basescan APIs.
- Any third-party indexer or backend transaction-listening service.
- User authentication. Merchants are identified by the wallet address they
  type into the form. The dashboard is keyed by what is stored locally in
  the browser.
- Refunds, partial payments, multi-token support, fiat off-ramp.
- Email / SMS notifications.
- Server-side database (Supabase, Postgres, etc.). This is planned for a
  later phase; the MVP must not depend on it.

## 4. Functional requirements

### 4.1 Create payment request (`/create`)

- WHEN the merchant opens `/create`, THE SYSTEM SHALL display a form with
  three fields: `recipient wallet address`, `amount in USDC`, `note`.
- WHEN the merchant submits the form, THE SYSTEM SHALL validate that:
  - `recipient` is a syntactically valid EVM address (`0x` + 40 hex chars).
  - `amount` is a positive number with at most 6 decimal places.
  - `note` is a string of at most 140 characters (may be empty).
- IF validation fails, THE SYSTEM SHALL show an inline error and NOT create
  a payment request.
- WHEN validation passes, THE SYSTEM SHALL:
  - Generate a unique `id` (e.g. `crypto.randomUUID()`).
  - Persist a `PaymentRequest` record to the local storage adapter with
    `status = "pending"`, `createdAt = now`, `network = "base-sepolia"`,
    `chainId = 84532`.
  - Redirect the merchant to `/pay/[id]` so they can immediately see the QR
    and share it.

### 4.2 Public payment page (`/pay/[id]`)

- WHEN the page loads, THE SYSTEM SHALL look up the payment request in the
  local storage adapter by `id`.
- IF the payment request is not found, THE SYSTEM SHALL render a 404-style
  "Payment not found" message.
- WHEN the payment request is found, THE SYSTEM SHALL render:
  - The recipient address (truncated, with full value on hover/copy).
  - The amount in USDC.
  - The note (if any).
  - A QR code whose payload is the absolute URL of the current payment page.
  - A "Pay with Base" button.
  - The current `status` (`pending`, `processing`, `completed`, `failed`).
- WHEN the customer clicks "Pay with Base", THE SYSTEM SHALL call
  `pay({ amount, to: recipient, testnet: true })` from `@base-org/account`.
- WHEN `pay` resolves with a payment id, THE SYSTEM SHALL:
  - Update the local record with `paymentId`, `status = "processing"`,
    `submittedAt = now`.
  - Begin polling `getPaymentStatus({ id: paymentId, testnet: true })`.
- WHEN polling reports a terminal status, THE SYSTEM SHALL update the local
  record (`status = "completed"` or `status = "failed"`, `settledAt = now`)
  and stop polling.
- WHEN `pay` rejects (user cancelled, error), THE SYSTEM SHALL leave the
  record in `pending` and show the error message inline.
- THE SYSTEM SHALL NOT pass any value other than `true` to `testnet`.

### 4.3 Receipt / status display

- WHEN `status = "completed"`, THE SYSTEM SHALL display a success receipt
  with the amount, recipient, note, payment id, and a link back to `/`.
- WHEN `status = "processing"` or `"pending"`, THE SYSTEM SHALL display a
  pending receipt with a spinner and a "checking on-chain confirmation"
  message.
- WHEN `status = "failed"`, THE SYSTEM SHALL display a failure receipt with
  a "Try again" action that resets the status to `pending`.
- THE SYSTEM SHALL NOT link to Basescan/Etherscan or any block explorer in
  the MVP.

### 4.4 Merchant dashboard (`/dashboard`)

- WHEN the merchant opens `/dashboard`, THE SYSTEM SHALL list all payment
  requests stored in the local storage adapter, sorted by `createdAt`
  descending.
- THE SYSTEM SHALL show, per row: short id, recipient (truncated), amount,
  note (truncated), status badge, created-at timestamp, and a link to
  `/pay/[id]`.
- THE SYSTEM SHALL provide a "New payment" button that links to `/create`.
- THE SYSTEM SHALL provide an empty state when there are no records.

### 4.5 Landing page (`/`)

- THE SYSTEM SHALL display a short description of Base Point and two
  primary CTAs: "Create a payment" (`/create`) and "Open dashboard"
  (`/dashboard`).
- THE SYSTEM SHALL display a clear "Base Sepolia testnet only" badge.

## 5. Non-functional requirements

- **Network safety**: every Base Pay call must pass `testnet: true`. There
  must be a single shared constant or helper used for this so it cannot
  drift across pages.
- **Chain safety**: the only supported chain id is `84532`. The constant
  must live in a single module.
- **Storage abstraction**: payment-request reads/writes go through a
  `PaymentStore` interface. The MVP implementation is `localStorage`.
- **Stateless server**: Next.js routes for the MVP do not need a database;
  all reads/writes happen client-side.
- **No external indexers**: the app must not call Basescan, Etherscan, or
  any third-party indexer.
- **Type safety**: the project uses TypeScript with `strict` mode.
- **Styling**: Tailwind CSS only; no UI component library is required.
- **Performance**: pages should render under 1s on a fast connection on a
  modern laptop. Polling interval for `getPaymentStatus` is 2s, with a
  hard timeout of 90s before showing a "still pending" message.

## 6. Acceptance criteria (MVP done)

The MVP is considered done when:

1. A merchant can create a payment request from `/create` and is redirected
   to `/pay/[id]` showing a QR code that encodes the current page URL.
2. Scanning that QR with a phone opens the same `/pay/[id]` page.
3. Clicking "Pay with Base" triggers Base Pay against Base Sepolia and
   returns a payment id without ever calling mainnet.
4. After a successful test payment, `/pay/[id]` shows a success receipt and
   `/dashboard` shows the request as `completed`.
5. Reloading any of the four pages preserves the data via `localStorage`.
6. There are zero references in the code to Etherscan, Basescan, mainnet
   chain ids, or balance/history endpoints.
