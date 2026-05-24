import Link from "next/link";

import { TestnetBadge } from "@/components/TestnetBadge";

/**
 * Base Point — landing page (`/`).
 *
 * Pure server component. Does NOT call Base Pay, does NOT touch
 * `localStorage`, and does NOT import `@base-org/account` or any
 * external indexer. Pages and components consume the network constants
 * indirectly through `<TestnetBadge />`.
 */

const STEPS: ReadonlyArray<{ n: number; title: string; body: string }> = [
  {
    n: 1,
    title: "Merchant creates a charge",
    body: "Enter the recipient wallet address, the amount in USDC, and an optional note.",
  },
  {
    n: 2,
    title: "Customer scans the QR",
    body: "Base Point generates a QR code that points to a public payment page on the open web.",
  },
  {
    n: 3,
    title: "Customer pays with Base Pay",
    body: "Base Sepolia testnet, USDC, one tap — no cards, no chargebacks, no FX fees.",
  },
  {
    n: 4,
    title: "Merchant sees the status",
    body: "The payment page polls on-chain status and updates the receipt automatically.",
  },
];

export default function HomePage() {
  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
        <section className="flex flex-col items-start gap-5">
          <TestnetBadge />
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Accept USDC at the point of sale.
          </h1>
          <p className="max-w-2xl text-pretty text-base text-slate-600 sm:text-lg">
            Base Point is a QR-style checkout for merchants on Base. Create a
            payment request, share the QR code, and let your customer pay in
            USDC with one tap &mdash; settled on Base Sepolia in seconds.
          </p>

          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              Create payment request
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
            >
              View dashboard
            </Link>
          </div>

          <p className="text-xs text-slate-500">
            MVP runs on Base Sepolia testnet only. No mainnet payments are
            ever sent.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            How it works
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
                  aria-hidden="true"
                >
                  {step.n}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
