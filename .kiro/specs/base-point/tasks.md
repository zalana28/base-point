# Base Point — Implementation Tasks

Tasks are ordered so the project compiles and is demoable as early as
possible. Each task is small enough to complete and review in one sitting.
Do not start a task until the previous one is merged or at least working.

Legend: `[ ]` not started, `[~]` in progress, `[x]` done.

---

## Phase 0 — Project bootstrap

- [ ] **T0.1 — Scaffold Next.js app**
  - `npx create-next-app@latest` with: TypeScript, App Router, Tailwind
    CSS, ESLint, `src/` *not* used (keep paths flat per design).
  - Confirm `tsconfig.json` has `"strict": true`.
  - Verify `next dev` boots a blank page.

- [ ] **T0.2 — Install runtime dependencies**
  - `npm i @base-org/account qrcode.react`
  - Pin versions in `package.json`.

- [ ] **T0.3 — Define network constants**
  - Create `lib/network.ts` exporting `CHAIN_ID = 84532`,
    `NETWORK_NAME = "base-sepolia"`, `IS_TESTNET = true` (all `as const`).
  - Add a unit-style assertion (a `// @ts-expect-error if-changed` comment)
    so accidentally flipping to mainnet is loud.

- [ ] **T0.4 — Add the Base Pay wrapper**
  - Create `lib/basePay.ts` with `startPayment` and `fetchPaymentStatus`,
    both passing `testnet: IS_TESTNET`.
  - This is the only file that imports `@base-org/account`.

- [ ] **T0.5 — Define core types**
  - Create `types/payment.ts` with `PaymentStatus` and `PaymentRequest`
    (per design §4).

---

## Phase 1 — Storage layer

- [ ] **T1.1 — Define `PaymentStore` interface**
  - Create `stores/paymentStore.ts` exporting the `PaymentStore`
    interface and a `getPaymentStore()` factory.

- [ ] **T1.2 — Implement `LocalPaymentStore`**
  - Create `stores/localPaymentStore.ts`.
  - Backed by `localStorage` key `base-point:payments:v1`.
  - All methods async; safe to call on the server (return `[]` / `null`
    when `window` is undefined, so SSR does not crash).
  - Wire `getPaymentStore()` to return this implementation.

- [ ] **T1.3 — Smoke-test storage in the browser console**
  - Manually verify `create`, `list`, `get`, `update` round-trip after a
    page reload. No automated tests yet.

---

## Phase 2 — Shared UI

- [ ] **T2.1 — Root layout and header**
  - Implement `app/layout.tsx` with Tailwind base styles.
  - Build `components/Header.tsx` with links to `/`, `/create`,
    `/dashboard`, and a `<TestnetBadge />`.

- [ ] **T2.2 — Build `TestnetBadge` and `StatusBadge`**
  - `TestnetBadge`: pill reading "Base Sepolia · testnet".
  - `StatusBadge`: maps `PaymentStatus` to colored Tailwind pills.

- [ ] **T2.3 — Add formatting helpers**
  - Create `lib/format.ts` with `truncateAddress`, `formatAmount`,
    `formatDate`.
  - Create `lib/ids.ts` exposing `newPaymentId()`.

- [ ] **T2.4 — Add validators**
  - Create `lib/validators.ts` with `isAddress`, `isAmount`, `isNote`.
  - Each returns `{ ok: true } | { ok: false, message: string }`.

---

## Phase 3 — Landing page

- [ ] **T3.1 — Implement `/`**
  - Server component.
  - Headline, short description, two CTAs (`/create`, `/dashboard`).
  - Render `<TestnetBadge />` prominently.

---

## Phase 4 — Create payment

- [ ] **T4.1 — Build `PaymentForm`**
  - Controlled form, three fields (recipient, amount, note).
  - Inline validation errors using `lib/validators`.
  - `onSubmit` callback receives the validated input.

- [ ] **T4.2 — Implement `/create` page**
  - Client component.
  - Renders `<PaymentForm />`.
  - On valid submit: `store.create(...)`, then `router.push('/pay/{id}')`.

---

## Phase 5 — Public payment page

- [ ] **T5.1 — Build `PaymentQrCard`**
  - Props: `recipient`, `amountUsdc`, `note`, `pageUrl`.
  - Renders truncated recipient (with copy), amount, note, and a
    `<QRCodeSVG value={pageUrl} />` from `qrcode.react`.
  - Includes a "Copy link" button.

- [ ] **T5.2 — Build `PayWithBaseButton`**
  - Props: `amount`, `to`, `onStatusChange(status, paymentId?)`.
  - On click: call `startPayment`, set `processing`, store `paymentId`.
  - Polls `fetchPaymentStatus` every 2s, max 90s.
  - Calls `onStatusChange` for each transition.
  - Cleans up timers on unmount.

- [ ] **T5.3 — Build `Receipt`**
  - Props: `payment: PaymentRequest`.
  - Renders different content per status (success, pending, failed),
    using `StatusBadge`.
  - Failure includes a "Try again" button that resets to `pending`.

- [ ] **T5.4 — Implement `/pay/[id]` page**
  - Client component.
  - On mount: load payment via `store.get(id)`.
  - If not found: render "Payment not found" state.
  - Else: render `<PaymentQrCard />`, `<PayWithBaseButton />`, and once a
    terminal status is reached, `<Receipt />`.
  - Persist every status transition through `store.update`.

---

## Phase 6 — Dashboard

- [ ] **T6.1 — Implement `/dashboard` page**
  - Client component.
  - On mount: `store.list()` and render rows.
  - Columns: short id, recipient (truncated), amount, note (truncated),
    status badge, created at, "Open" link to `/pay/[id]`.
  - Empty state with a "New payment" CTA.

---

## Phase 7 — End-to-end check (manual)

- [ ] **T7.1 — Local manual test**
  - Run `next dev`.
  - Create a payment request from `/create`.
  - Confirm redirect to `/pay/[id]` shows the QR.
  - Scan with phone, confirm same page loads on phone.
  - Click "Pay with Base", complete payment with a Base Sepolia test
    wallet that holds testnet USDC (Circle faucet).
  - Confirm receipt shows `completed` and `/dashboard` reflects it.

- [ ] **T7.2 — Safety audit**
  - Grep the repo for `mainnet`, `etherscan`, `basescan`, `8453` —
    expect zero hits.
  - Grep for `testnet:` — expect every match to be `testnet: IS_TESTNET`
    or `testnet: true` inside `lib/basePay.ts` only.
  - Confirm no balance / history fetching code exists.

---

## Phase 8 — Out of scope for the MVP (parking lot)

These are intentionally NOT scheduled. They are listed here only so they
do not get smuggled into the MVP work.

- Supabase storage adapter.
- Sign in with Base (merchant auth).
- Mainnet support, gated by an env flag.
- Server-side payment confirmation webhook.
- CSV export from `/dashboard`.
- Email receipts.

---

## Definition of done for the MVP

The MVP ships when every task in Phases 0 – 7 is `[x]`, plus:

1. `npm run build` succeeds with no TypeScript errors.
2. `npm run lint` is clean.
3. Manual test in T7.1 passes end-to-end on Base Sepolia.
4. Safety audit in T7.2 passes (zero mainnet / explorer / balance refs).
