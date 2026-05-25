import { ImageResponse } from "next/og";

/**
 * Base Point — Open Graph / social preview image (1200x630 PNG).
 *
 * Picked up automatically by the App Router file convention and added
 * to the page metadata as `<meta property="og:image">` /
 * `<meta name="twitter:image">`. Renders the Base Point logo + tagline
 * on the same dark slate gradient used by the live app.
 *
 * Implemented with `next/og` (Satori), which renders a subset of
 * HTML/CSS to a PNG. We keep the layout to flexbox + linear-gradients
 * + bordered boxes so it works without any custom font payload — the
 * default Inter that ships with Satori is sufficient.
 */

export const alt = "Base Point — USDC checkout for merchants on Base";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          color: "#f8fafc",
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(33,81,245,0.32) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 90% 110%, rgba(34,211,238,0.18) 0%, transparent 55%), linear-gradient(180deg, #020617 0%, #040614 55%, #02050d 100%)",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Top bar: logo + wordmark + network pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {/* Logo mark */}
            <div
              style={{
                position: "relative",
                width: 96,
                height: 96,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg, #1e40ff 0%, #4f46e5 55%, #22d3ee 100%)",
                borderRadius: 22,
                boxShadow: "0 0 60px -8px rgba(33,81,245,0.6)",
                color: "white",
                fontSize: 60,
                fontWeight: 800,
                letterSpacing: -3,
              }}
            >
              {/* Top sheen */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 50%)",
                  borderRadius: 22,
                }}
              />
              {/* QR finder accent */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#34d399",
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#04060f",
                    borderRadius: 2,
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      background: "#34d399",
                      borderRadius: 1,
                    }}
                  />
                </div>
              </div>
              {/* BP */}
              <span style={{ position: "relative" }}>BP</span>
            </div>

            {/* Wordmark */}
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                letterSpacing: -1,
                color: "#f1f5f9",
              }}
            >
              Base Point
            </div>
          </div>

          {/* Live-on-Base pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              borderRadius: 999,
              border: "1px solid rgba(52,211,153,0.4)",
              background: "rgba(52,211,153,0.12)",
              color: "#a7f3d0",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                background: "#34d399",
                borderRadius: 5,
              }}
            />
            Live on Base mainnet
          </div>
        </div>

        {/* Tagline block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            maxWidth: 1040,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 92,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1.02,
            }}
          >
            <div style={{ display: "flex" }}>USDC checkout for</div>
            <div
              style={{
                display: "flex",
                background:
                  "linear-gradient(90deg, #60a5fa 0%, #67e8f9 50%, #6ee7b7 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              merchants on Base.
            </div>
          </div>
          <div style={{ fontSize: 30, color: "#94a3b8", display: "flex" }}>
            Pay with Base or any EVM wallet · Real USDC, settled in seconds
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
