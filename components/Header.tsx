import Link from "next/link";

import { TestnetBadge } from "./TestnetBadge";

/**
 * Top navigation rendered on every page. Pure server component — no
 * hooks, no Base Pay or storage dependencies.
 */
export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-slate-900"
        >
          <span className="text-base">Base Point</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/create"
            className="text-slate-600 transition-colors hover:text-slate-900"
          >
            Create
          </Link>
          <Link
            href="/dashboard"
            className="text-slate-600 transition-colors hover:text-slate-900"
          >
            Dashboard
          </Link>
          <TestnetBadge />
        </nav>
      </div>
    </header>
  );
}
