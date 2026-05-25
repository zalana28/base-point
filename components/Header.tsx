import Link from "next/link";

import { NetworkBadge } from "./NetworkBadge";

/**
 * Top navigation rendered on every page. Pure server component — no
 * hooks, no Base Pay or storage dependencies.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-semibold tracking-tight text-slate-100"
        >
          <span
            aria-hidden="true"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_20px_-6px_rgba(33,81,245,0.7)] transition-transform duration-300 group-hover:scale-105"
          >
            <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 via-transparent to-transparent" />
            <span className="relative text-sm font-bold text-white">B</span>
          </span>
          <span className="text-base">Base Point</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/create"
            className="rounded-md px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Create
          </Link>
          <Link
            href="/dashboard"
            className="hidden rounded-md px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white sm:inline-flex"
          >
            Dashboard
          </Link>
          <span className="ml-1 hidden sm:inline-flex">
            <NetworkBadge />
          </span>
        </nav>
      </div>
    </header>
  );
}
