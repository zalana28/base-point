import { ImageResponse } from "next/og";

/**
 * Base Point — generated Apple touch icon (180x180 PNG).
 *
 * Picked up automatically by the App Router file convention and used
 * by iOS / iPadOS when a visitor adds the site to their home screen.
 * Carries a slightly more decorative version of the mark (the QR
 * finder accent + the bottom-right scan dot) since 180px gives us
 * room for the details that get clipped at 32px in `icon.tsx`.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          color: "white",
          background:
            "linear-gradient(135deg, #1e40ff 0%, #4f46e5 55%, #22d3ee 100%)",
          borderRadius: 40,
          fontSize: 100,
          fontWeight: 800,
          letterSpacing: -6,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Top sheen overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 50%)",
            borderRadius: 40,
          }}
        />

        {/* QR finder accent */}
        <div
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#34d399",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#04060f",
              borderRadius: 4,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                background: "#34d399",
                borderRadius: 1.5,
              }}
            />
          </div>
        </div>

        {/* BP monogram */}
        <span style={{ position: "relative" }}>BP</span>

        {/* Scan dot */}
        <div
          style={{
            position: "absolute",
            bottom: 22,
            right: 26,
            width: 10,
            height: 10,
            background: "rgba(255,255,255,0.7)",
            borderRadius: 5,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
