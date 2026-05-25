import type { Metadata } from "next";

import { NetworkBadge } from "@/components/NetworkBadge";
import { PaymentForm } from "@/components/PaymentForm";

/**
 * Base Point — `/create`.
 *
 * Server Component shell. The interactive form lives in
 * `<PaymentForm />`, which is the only Client Component on this route
 * and the only thing that calls into the storage layer.
 *
 * Creating a payment request is purely offchain (a write to
 * `localStorage`); it does NOT broadcast a transaction and does NOT
 * require gas. Customer-side payment is what consumes USDC and (for
 * the wallet path) Base ETH for gas.
 *
 * No Base Pay calls, no @base-org/account import, no localStorage,
 * no balance/history reads, no block-explorer or third-party indexer.
 */

export const metadata: Metadata = {
  title: "Create payment \u00b7 Base Point",
  description:
    "Create a USDC payment request on Base mainnet and share the link by QR code. Creating the request is offchain and gasless.",
};

export default function CreatePage() {
  return (
    <div className="relative flex-1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 mx-auto h-72 w-full max-w-3xl bg-[radial-gradient(closest-side,rgba(33,81,245,0.22),transparent_75%)] blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-start gap-4">
          <NetworkBadge />
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Create payment request
          </h1>
          <p className="max-w-lg text-sm text-slate-400">
            Fill in the recipient, amount, and an optional note. We&rsquo;ll
            generate a public checkout page you can share &mdash; the QR code
            appears on the next screen.
          </p>
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-slate-300">
            Creating a payment request is offchain and gasless. The
            customer pays in USDC on Base mainnet when they open the
            checkout link.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
          <PaymentForm />
        </div>
      </div>
    </div>
  );
}
