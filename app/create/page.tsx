import type { Metadata } from "next";

import { PaymentForm } from "@/components/PaymentForm";
import { TestnetBadge } from "@/components/TestnetBadge";

/**
 * Base Point — `/create`.
 *
 * Server Component shell. The interactive form lives in
 * `<PaymentForm />`, which is the only Client Component on this route
 * and the only thing that calls into the storage layer.
 *
 * No Base Pay calls, no @base-org/account import, no localStorage,
 * no mainnet, no balance/history reads, no block-explorer or
 * third-party indexer.
 */

export const metadata: Metadata = {
  title: "Create payment · Base Point",
  description:
    "Create a USDC payment request on Base Sepolia and share the link by QR code.",
};

export default function CreatePage() {
  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:py-16">
        <TestnetBadge />
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-900">
          Create payment request
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Fill in the recipient, amount, and an optional note. We&rsquo;ll
          generate a public payment page you can share &mdash; the QR code
          appears on the next screen.
        </p>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <PaymentForm />
        </div>
      </div>
    </div>
  );
}
