/**
 * Base Point — brand logo system.
 *
 * Reusable, server-renderable SVG logo used in the header, marketing
 * surfaces, and (indirectly) the generated favicon and Open Graph
 * image.
 *
 * Design notes (kept close to the source so future tweaks land in one
 * place):
 *
 *  - The mark is a rounded square in a Base-inspired blue-to-cyan
 *    gradient. We deliberately do NOT reuse Base's official mark.
 *    Instead the square carries a custom "BP" monogram and a small
 *    emerald accent block that hints at a QR finder pattern — i.e. the
 *    "checkout / point of sale" half of the product.
 *  - A subtle top-edge sheen + a small bottom-right scan dot give the
 *    mark depth at large sizes without muddying it at small sizes.
 *  - The wordmark uses the page font (Geist via next/font) at a tight
 *    tracking so it reads as a bold fintech logotype next to the mark.
 *
 * The mark is implemented with one `<svg viewBox="0 0 64 64">` so it
 * scales crisply from 16px favicon-style use up to hero/marketing
 * sizes. Multiple instances on the same page intentionally share the
 * gradient ids — modern browsers resolve duplicate `<defs>` by id and
 * the gradients are byte-identical anyway, so there is no visual
 * artifact and we keep the component a pure server component (no
 * `useId`, no client boundary).
 */

import type { CSSProperties } from "react";

export type BasePointLogoSize = "sm" | "md" | "lg";

interface BasePointLogoProps {
  /**
   * Visual size preset. `sm` matches the previous header tile, `md`
   * works on cards / mockups, `lg` is intended for hero placements.
   */
  size?: BasePointLogoSize;
  /** When true, renders the "Base Point" wordmark next to the mark. */
  showWordmark?: boolean;
  /** Optional extra classes applied to the outer wrapper. */
  className?: string;
}

const SIZES: Record<
  BasePointLogoSize,
  { mark: number; wordmark: string; gap: string; glow: string }
> = {
  sm: {
    mark: 32,
    wordmark: "text-base",
    gap: "gap-2.5",
    glow: "shadow-[0_0_20px_-6px_rgba(33,81,245,0.7)]",
  },
  md: {
    mark: 44,
    wordmark: "text-lg",
    gap: "gap-3",
    glow: "shadow-[0_0_28px_-6px_rgba(33,81,245,0.7)]",
  },
  lg: {
    mark: 64,
    wordmark: "text-2xl",
    gap: "gap-3.5",
    glow: "shadow-[0_0_36px_-6px_rgba(33,81,245,0.75)]",
  },
};

/**
 * Pure server component. Safe to render inside Server Components; no
 * hooks, no event handlers, no client-only APIs.
 */
export function BasePointLogo({
  size = "sm",
  showWordmark = false,
  className = "",
}: BasePointLogoProps) {
  const config = SIZES[size];

  return (
    <span
      className={`inline-flex items-center font-semibold tracking-tight text-slate-100 ${config.gap} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex shrink-0 transition-transform duration-300 motion-safe:group-hover:scale-105 ${config.glow}`}
        style={{ width: config.mark, height: config.mark }}
      >
        <BasePointLogoMark size={config.mark} />
      </span>
      {showWordmark ? (
        <span className={`leading-none ${config.wordmark}`}>Base Point</span>
      ) : null}
    </span>
  );
}

/* -------------------------------------------------------------------- */
/* The SVG mark itself                                                   */
/* -------------------------------------------------------------------- */

interface BasePointLogoMarkProps {
  /**
   * Pixel size of the rendered SVG. The internal viewBox is fixed at
   * `0 0 64 64` so the mark stays crisp at any size.
   */
  size?: number;
  /** Optional extra classes for the bare SVG, e.g. positioning. */
  className?: string;
  /** Optional inline style override. */
  style?: CSSProperties;
}

/**
 * The bare SVG mark, exported separately so consumers (e.g. compact
 * metadata previews) can drop the wordmark and any wrapper styling.
 */
export function BasePointLogoMark({
  size = 32,
  className = "",
  style,
}: BasePointLogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Base Point"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        {/*
          Diagonal Base-inspired gradient. The colours are the same
          --accent-* CSS variables used elsewhere in the app, baked
          into the SVG so the mark renders correctly when copied
          into emails, screenshots, etc.
        */}
        <linearGradient
          id="bp-logo-bg"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1e40ff" />
          <stop offset="55%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        {/* Top sheen — softens the otherwise flat gradient. */}
        <linearGradient
          id="bp-logo-shine"
          x1="0"
          y1="0"
          x2="0"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="white" stopOpacity="0.32" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Rounded square base */}
      <rect
        x="0"
        y="0"
        width="64"
        height="64"
        rx="14"
        fill="url(#bp-logo-bg)"
      />
      {/* Inner top sheen */}
      <rect
        x="0"
        y="0"
        width="64"
        height="32"
        rx="14"
        fill="url(#bp-logo-shine)"
      />

      {/*
        BP monogram. We use SVG <text> so the letterforms benefit from
        the system bold sans (Geist on the live page; system-ui as
        fallback in screenshots / OG previews). The negative
        letter-spacing pulls the B and P into a tight, locked-up pair
        that reads as a single mark.
      */}
      <text
        x="31.5"
        y="33"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontWeight={800}
        fontSize="34"
        letterSpacing="-2"
        fill="white"
      >
        BP
      </text>

      {/*
        Emerald QR-finder accent in the top-right. The outer square +
        inner dark cell + smallest pixel deliberately echo the shape
        of a QR finder pattern without copying it pixel-for-pixel.
      */}
      <g>
        <rect x="46" y="6" width="12" height="12" rx="3" fill="#34d399" />
        <rect x="49" y="9" width="6" height="6" rx="1.25" fill="#04060f" />
        <rect x="51" y="11" width="2" height="2" rx="0.5" fill="#34d399" />
      </g>

      {/* Tiny scan dot at bottom-right — subtle "checkout" cue. */}
      <circle cx="56" cy="56" r="2" fill="white" fillOpacity="0.7" />
    </svg>
  );
}
