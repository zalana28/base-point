"use client";

import { useEffect, useState } from "react";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReduced(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}

export function SuccessAnimation() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5 shadow-2xl shadow-emerald-500/10 backdrop-blur">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(52,211,153,0.25),transparent_60%)] ${
          reducedMotion ? "" : "motion-safe:animate-pulse"
        }`}
      />
      <div className="relative flex items-center gap-4">
        <div
          className={`relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-[0_0_30px_-4px_rgba(52,211,153,0.6)] ${
            reducedMotion ? "" : "motion-safe:animate-[bounce_1.2s_ease-out_1]"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12.5l4.5 4.5L19 8" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Payment confirmed
          </p>
          <p className="mt-0.5 text-sm text-emerald-100">
            Funds were received on Base Sepolia.
          </p>
        </div>
      </div>
    </div>
  );
}
