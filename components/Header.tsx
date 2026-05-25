import Link from "next/link";

import { BasePointLogo } from "./BasePointLogo";
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
          className="group flex items-center"
          aria-label="Base Point — home"
        >
          <BasePointLogo size="sm" showWordmark />
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
