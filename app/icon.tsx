import { ImageResponse } from "next/og";

/**
 * Base Point — generated favicon (32x32 PNG).
 *
 * Next.js automatically picks this up via the App Router file
 * convention and adds a `<link rel="icon" href="/icon" type="image/png"
 * sizes="32x32">` tag to <head>. We render the same Base Point mark
 * used by `<BasePointLogo />` here so the brand stays consistent
 * across the page header, the browser tab, and any OS-level pinned
 * shortcut.
 *
 * The mark is intentionally re-implemented in HTML/CSS rather than
 * imported from `BasePointLogo.tsx`: `next/og` (Satori) only renders a
 * subset of HTML/CSS and does not run our SVG component, so a tiny
 * dedicated render keeps the favicon path predictable and avoids
 * SSR-vs-Satori divergence.
 */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          background:
            "linear-gradient(135deg, #1e40ff 0%, #4f46e5 55%, #22d3ee 100%)",
          borderRadius: 7,
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: -1,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        BP
      </div>
    ),
    { ...size },
  );
}
