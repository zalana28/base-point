# Base Point — Design

## 1. Architecture overview

Base Point is a single Next.js App Router application. There is no backend
service in the MVP — all state lives in the browser via `localStorage`,
behind a small storage interface so a Supabase-backed adapter can replace
it later without touching the pages.

```
┌──────────────────────────────────────────────────────────┐
│                     Next.js (App Router)                 │
│                                                          │
│  /            /create        /pay/[id]      /dashboard   │
│   │             │                │              │        │
│   └─── shared UI (Tailwind) ─────┴──────────────┘        │
│                                                          │
│  ┌────────────────────────┐    ┌──────────────────────┐  │
│  │ PaymentStore interface │◄───┤ pages / components   │  │
│  └─────────┬──────────────┘    └──────────┬───────────┘  │
│            │                              │              │
│  ┌─────────▼──────────┐         ┌─────────▼───────────┐  │
│  │ LocalStorageStore  │         │ basePay (wrapper of │  │
│  │ (MVP)              │         │ @base-org/account)  │  │
│  └────────────────────┘         └─────────────────────┘  │
│                                                          │
│  ┌──── future ────┐                                      │
│  │ SupabaseStore  │  (drop-in replacement, post-MVP)     │
│  └────────────────┘                                      │
└──────────────────────────────────────────────────────────┘
```

Key design rules:

- The Base Pay testnet flag and the Base Sepolia chain id are defined once,
  in `lib/network.ts`, and re-exported everywhere.
- Pages never import `@base-org/account` directly — they go through
  `lib/basePay.ts`. That wrapper is the only place where `testnet: true` is
  set.
- Pages never touch `localStorage` directly — they go through the
  `PaymentStore` interface. The interface is async even though the MVP
  implementation resolves synchronously, so swapping in Supabase later
  requires no refactor.

## 2. Tech stack

| Concern              | Choice                                  |
|----------------------|-----------------------------------------|
| Framework            | Next.js (App Router)                    |
| Language             | TypeScript (strict)                     |
| Styling              | Tailwind CSS                            |
| Wallet / payments    | `@base-org/account` (Base Pay)          |
| QR generation        | `qrcode.react`                          |
| Persistence (MVP)    | Browser `localStorage`                  |
| Persistence (later)  | Supabase (deferred, not in MVP)         |
| Network              | Base Sepolia (chain id `84532`) only    |

## 3. Folder structure

```
app/
  layout.tsx              # Root layout, Tailwind, fonts, header
  page.tsx                # Landing
  create/
    page.tsx              # Create payment form
  pay/
    [id]/
      page.tsx            # Public payment page (client component)
  dashboard/
    page.tsx              # Merchant dashboard

components/
  PaymentForm.tsx         # Form used by /create
  PaymentQrCard.tsx       # Recipient + amount + QR + share
  PayWithBaseButton.tsx   # Wraps Base Pay action + status polling
  StatusBadge.tsx         # Pending / processing / completed / failed
  Receipt.tsx             # Final receipt display
  TestnetBadge.tsx        # "Base Sepolia testnet only" pill
  Header.tsx              # Top nav with links

lib/
  network.ts              # CHAIN_ID, NETWORK_NAME, IS_TESTNET constants
  basePay.ts              # pay() / getPaymentStatus() wrappers
  validators.ts           # address + amount + note validators
  format.ts               # truncateAddress, formatAmount, formatDate
  ids.ts                  # newPaymentId() => crypto.randomUUID()

stores/
  paymentStore.ts         # PaymentStore interface + factory
  localPaymentStore.ts    # localStorage implementation

types/
  payment.ts              # PaymentRequest, PaymentStatus types

.kiro/
  specs/
    base-point/
      requirements.md
      design.md
      tasks.md
```

## 4. Data model

```ts
// types/payment.ts
//
// NOTE: We deliberately call this `PaymentRequestStatus` (not `PaymentStatus`)
// because `@base-org/account` already exports a `PaymentStatus` type that
// represents the on-chain status object returned by `getPaymentStatus`.
// Our type is the lifecycle of a *local* payment request record.
export type PaymentRequestStatus =
  | "pending"      // created, not yet paid
  | "processing"   // pay() submitted, waiting for confirmation
  | "completed"    // getPaymentStatus reported success
  | "failed";      // user cancelled or chain reported failure

export interface PaymentRequest {
  id: string;            // local uuid, used in /pay/[id]
  recipient: `0x${string}`;
  amountUsdc: string;    // string to avoid float drift, e.g. "10.50"
  note: string;          // may be ""
  status: PaymentRequestStatus;

  // Base Pay correlation
  paymentId?: string;    // returned by pay()
  errorMessage?: string;

  // Network metadata, hard-coded in MVP but stored for forward-compat
  network: "base-sepolia";
  chainId: 84532;

  // Timestamps (epoch ms)
  createdAt: number;
  submittedAt?: number;
  settledAt?: number;
}
```

## 5. Storage interface

```ts
// stores/paymentStore.ts
export interface PaymentStore {
  list(): Promise<PaymentRequest[]>;
  get(id: string): Promise<PaymentRequest | null>;
  create(input: Omit<PaymentRequest,
    "id" | "status" | "createdAt" | "network" | "chainId">
  ): Promise<PaymentRequest>;
  update(id: string, patch: Partial<PaymentRequest>): Promise<PaymentRequest>;
}

export function getPaymentStore(): PaymentStore;
```

The MVP implementation (`localPaymentStore.ts`) reads and writes a single
JSON array under the key `base-point:payments:v1`. All methods are `async`
to keep the interface stable for a future Supabase implementation.

`getPaymentStore()` returns the local store today. When Supabase lands, it
will read an env flag and return the appropriate adapter.

## 6. Network constants

```ts
// lib/network.ts
export const CHAIN_ID = 84532 as const;
export const NETWORK_NAME = "base-sepolia" as const;
export const IS_TESTNET = true as const;
```

`IS_TESTNET` is the single source of truth that gets passed to Base Pay.
Changing networks requires changing this file, and nothing else.

## 7. Base Pay wrapper

```ts
// lib/basePay.ts
import { pay, getPaymentStatus } from "@base-org/account";
import { IS_TESTNET } from "./network";

export async function startPayment(args: {
  amount: string;
  to: `0x${string}`;
}) {
  return pay({ amount: args.amount, to: args.to, testnet: IS_TESTNET });
}

export async function fetchPaymentStatus(paymentId: string) {
  return getPaymentStatus({ id: paymentId, testnet: IS_TESTNET });
}
```

This is the only file that imports `@base-org/account`. Pages and
components import from `lib/basePay` instead, which keeps `testnet: true`
centralized.

## 8. Page-by-page design

### 8.1 `/` — Landing

- Hero: "Accept USDC on Base with a QR code".
- Two CTAs: `Create a payment` (link to `/create`) and `Open dashboard`
  (link to `/dashboard`).
- `<TestnetBadge />` clearly visible.
- Pure server component.

### 8.2 `/create` — Create payment

- Client component (uses `useRouter`).
- Renders `<PaymentForm />`.
- Form fields: `recipient`, `amountUsdc`, `note`.
- On submit:
  1. Validate via `lib/validators`.
  2. Call `store.create(...)`.
  3. `router.push(`/pay/${created.id}`)`.

### 8.3 `/pay/[id]` — Public payment page

- Client component (needs window for QR URL + storage).
- On mount, reads payment by id from store.
- Shows `<PaymentQrCard />` with the request details, plus the QR encoding
  `window.location.href`.
- Shows `<PayWithBaseButton />` — disabled if `status === "completed"`.
- When user clicks pay:
  1. Call `startPayment({ amount, to: recipient })`.
  2. On resolve, persist `{ paymentId, status: "processing", submittedAt }`.
  3. Begin polling `fetchPaymentStatus(paymentId)` every 2s.
  4. On terminal status, persist `{ status, settledAt }`, stop polling.
- Renders `<Receipt />` once `status` is terminal.

### 8.4 `/dashboard` — Merchant dashboard

- Client component.
- On mount, calls `store.list()`.
- Shows table with columns: id (short), recipient (truncated), amount,
  note (truncated to ~30 chars), status badge, created at, action link.
- Empty state when list is empty.
- "New payment" CTA links to `/create`.

## 9. Component design

- **`PaymentForm`** — controlled form, surfaces validation errors inline.
- **`PaymentQrCard`** — composes recipient row, amount row, note row, and
  `<QRCodeSVG value={pageUrl} />` from `qrcode.react`. Includes a
  "Copy link" button.
- **`PayWithBaseButton`** — encapsulates the call to `startPayment`, the
  polling loop, and the loading state. Accepts an `onStatusChange`
  callback so the parent page can persist updates.
- **`StatusBadge`** — colored pill mapping status → Tailwind classes.
- **`Receipt`** — renders different content per status; uses `StatusBadge`.
- **`TestnetBadge`** — small pill: "Base Sepolia · testnet".
- **`Header`** — links to `/`, `/create`, `/dashboard`, and renders
  `<TestnetBadge />`.

## 10. Status polling

```
click "Pay with Base"
   │
   ▼
startPayment({ amount, to })
   │
   ├── reject ──► status = "pending", show error
   │
   └── resolve { id }
           │
           ▼
   persist { paymentId, status: "processing", submittedAt }
           │
           ▼
   every 2s for up to 90s:
       fetchPaymentStatus(paymentId)
           ├── completed ► persist { status: "completed", settledAt }; stop
           ├── failed    ► persist { status: "failed", settledAt }; stop
           └── otherwise ► continue
   │
   ▼
   timeout (90s) ► keep status = "processing", show
                   "still pending — check back later" message
```

The polling lives inside `PayWithBaseButton` and is cancelled on unmount
or when a terminal status is reached.

## 11. Error handling

- Form validation errors render inline next to the offending field.
- `pay()` rejection (user cancelled, network error) updates the UI with
  the error message and leaves `status` at `pending` so the customer can
  retry.
- `getPaymentStatus()` errors are retried silently up to the 90s window.
- Storage errors render a top-level toast/banner; the form is not cleared.

## 12. Security and safety considerations

- The app accepts a wallet address as user input on `/create`. Validation
  is purely syntactic (`0x` + 40 hex). The merchant is responsible for
  entering the correct address.
- Payment data lives in the merchant's browser only. There is no shared
  backend in the MVP, so nothing is leaked across browsers.
- The `IS_TESTNET = true` constant is asserted with `as const` so any
  attempt to flip it to mainnet is a single-file change that is easy to
  review.
- No private keys or seed phrases are handled by the app; signing happens
  inside the Base Account SDK.

## 13. Future work (deferred, not part of MVP)

- Replace `LocalPaymentStore` with `SupabasePaymentStore` (same interface).
- Add merchant authentication (Sign in with Base) so the dashboard is
  scoped per-merchant rather than per-browser.
- Mainnet support, gated by an explicit env flag.
- Webhook / server-side confirmation listener so receipts are accurate
  without the customer keeping the page open.
- CSV export from the dashboard.
