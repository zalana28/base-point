import Link from "next/link";

import { NetworkBadge } from "@/components/NetworkBadge";

/**
 * Base Point — landing page (`/`).
 *
 * Pure server component. Does NOT call Base Pay, does NOT touch
 * `localStorage`, and does NOT import `@base-org/account` or any
 * external indexer. Pages and components consume the network constants
 * indirectly through `<NetworkBadge />`.
 */

const STEPS: ReadonlyArray<{ n: number; title: string; body: string }> = [
  {
    n: 1,
    title: "Create a charge",
    body: "Enter the recipient wallet, the USDC amount, and an optional note. Creating the request is offchain and gasless.",
  },
  {
    n: 2,
    title: "Share the QR",
    body: "Base Point gives you a public checkout link with a scannable QR code.",
  },
  {
    n: 3,
    title: "Customer pays",
    body: "Pay with Base for one-tap checkout, or any EVM wallet on Base mainnet.",
  },
  {
    n: 4,
    title: "See it settle",
    body: "The checkout polls on-chain status and updates the receipt automatically.",
  },
];

const FEATURES: ReadonlyArray<{
  title: string;
  body: string;
  icon: "bolt" | "shield" | "wallet";
}> = [
  {
    title: "One-tap Base Pay",
    body: "USDC checkout that feels like Apple Pay — no card form, no popup chain.",
    icon: "bolt",
  },
  {
    title: "Bring your own wallet",
    body: "MetaMask, Rabby, Coinbase Wallet, and WalletConnect-compatible wallets.",
    icon: "wallet",
  },
  {
    title: "Live on Base mainnet",
    body: "Real USDC on Base. Pinned to chain id 8453 in code, with the SDK testnet flag forced off.",
    icon: "shield",
  },
];

export default function HomePage() {
  return (
    <div className="relative flex-1">
      {/* Soft accent glow behind the hero */}
      <div
        aria-hidden="true"
        className="bp-aurora pointer-events-none absolute inset-x-0 top-[-10%] -z-0 mx-auto h-[520px] w-[90%] max-w-5xl rounded-full bg-[radial-gradient(closest-side,rgba(79,70,229,0.35),rgba(34,211,238,0.18)_45%,transparent_75%)] blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:pt-24">
        {/* ---------------------------------------------------------- */}
        {/* Hero                                                        */}
        {/* ---------------------------------------------------------- */}
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Built on Base &middot; Powered by USDC
            </span>

            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Accept USDC at the
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                point of sale.
              </span>
            </h1>

            <p className="max-w-xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
              Base Point is a QR-style checkout for merchants on Base. Create a
              payment request, share the QR, and let your customer pay in USDC
              with one tap &mdash; settled on Base mainnet in seconds.
            </p>

            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/create"
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgba(33,81,245,0.6)] transition-all duration-300 hover:shadow-[0_18px_50px_-10px_rgba(33,81,245,0.85)] motion-safe:hover:-translate-y-0.5"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">Create payment request</span>
                <svg
                  className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/10"
              >
                View dashboard
              </Link>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <NetworkBadge />
              <span>Mainnet mode uses real USDC.</span>
            </div>
          </div>

          {/* Hero mockup --------------------------------------------- */}
          <CheckoutMockup />
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Feature row                                                */}
        {/* ---------------------------------------------------------- */}
        <section className="mt-24 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feat) => (
            <FeatureCard key={feat.title} {...feat} />
          ))}
        </section>

        {/* ---------------------------------------------------------- */}
        {/* How it works                                                */}
        {/* ---------------------------------------------------------- */}
        <section className="mt-24">
          <div className="flex flex-col items-start gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              How it works
            </span>
            <h2 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              From charge to settled, in four steps.
            </h2>
          </div>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60"
                  aria-hidden="true"
                />
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-400/20 text-sm font-semibold text-cyan-200 ring-1 ring-inset ring-white/10"
                  aria-hidden="true"
                >
                  {step.n}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* CTA                                                         */}
        {/* ---------------------------------------------------------- */}
        <section className="mt-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 text-center backdrop-blur sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(34,211,238,0.18),transparent_70%)]"
            />
            <div className="relative mx-auto max-w-xl">
              <h3 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Spin up a checkout in 30 seconds.
              </h3>
              <p className="mt-3 text-sm text-slate-400 sm:text-base">
                No accounts. No SDK install. Just a wallet, an amount, and a QR
                code your customer can scan. Customers need USDC on Base; wallet
                payments may require Base ETH for gas.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/create"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgba(33,81,245,0.6)] transition-shadow hover:shadow-[0_18px_50px_-10px_rgba(33,81,245,0.85)]"
                >
                  Create your first payment
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Mockup + feature helpers                                              */
/* -------------------------------------------------------------------- */

function FeatureCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: "bolt" | "shield" | "wallet";
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition-colors hover:border-white/20">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-400/15 text-cyan-300 ring-1 ring-inset ring-white/10">
          <FeatureIcon name={icon} />
        </span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}

function FeatureIcon({ name }: { name: "bolt" | "shield" | "wallet" }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "h-5 w-5",
  };
  if (name === "bolt") {
    return (
      <svg {...common}>
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Decorative checkout mockup. Pure JSX, no client logic — does NOT call
 * Base Pay, does NOT touch storage, does NOT render a real QR.
 */
function CheckoutMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0">
      {/* Glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-[conic-gradient(from_120deg_at_50%_50%,rgba(33,81,245,0.35),rgba(34,211,238,0.25),rgba(52,211,153,0.2),rgba(33,81,245,0.35))] opacity-40 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-medium text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Base &middot; Mainnet
          </span>
          <span className="font-mono text-slate-500">#A1F3 &middot; Preview</span>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Amount due
          </p>
          <p className="mt-1 text-5xl font-semibold tracking-tight text-white">
            24.50{" "}
            <span className="text-xl font-medium text-slate-400">USDC</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Order #1029 &middot; Coffee</p>
        </div>

        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          {/* Stylised QR */}
          <div
            aria-hidden="true"
            className="grid h-24 w-24 shrink-0 grid-cols-7 grid-rows-7 gap-0.5 rounded-lg bg-white p-1.5"
          >
            {Array.from({ length: 49 }).map((_, i) => {
              // Deterministic-ish pattern + finder squares.
              const isFinder =
                (i < 21 && (i % 7 < 3) && i < 21 && Math.floor(i / 7) < 3) ||
                (i % 7 >= 4 && Math.floor(i / 7) < 3) ||
                (i % 7 < 3 && Math.floor(i / 7) >= 4);
              const filled = isFinder || (i * 31) % 7 < 3;
              return (
                <span
                  key={i}
                  className={
                    filled
                      ? "rounded-[1px] bg-slate-900"
                      : "rounded-[1px] bg-transparent"
                  }
                />
              );
            })}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-300">
              Scan to checkout
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Open with your phone camera. Choose Pay with Base or Pay with
              Wallet on the next screen.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">
            <span
              aria-hidden="true"
              className="flex h-4 w-4 items-center justify-center rounded-sm bg-white/20"
            >
              <span className="text-[10px] font-bold">B</span>
            </span>
            Pay with Base
          </div>
          <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200">
            Pay with Wallet
          </div>
        </div>
      </div>
    </div>
  );
}
