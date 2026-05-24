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
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
      <div
        className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_65%)] ${reducedMotion ? "" : "animate-pulse"}`}
      />
      <div className="relative flex items-center gap-4">
        <div className={`relative grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white shadow-md ${reducedMotion ? "" : "animate-[bounce_1.2s_ease-out_1]"}`}>
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 8" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Payment confirmed</p>
          <p className="text-sm text-emerald-900">Funds were received on Base Sepolia.</p>
        </div>
      </div>
    </div>
  );
}
