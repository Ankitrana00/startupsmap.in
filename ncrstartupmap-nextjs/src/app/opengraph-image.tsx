import { ImageResponse } from "next/og";

// Open Graph preview image — 1200×630, rendered as a React element so
// `ImageResponse` can rasterize it. Matches the brand tile from
// src/app/icon.svg: gradient tile #0b0b12 → #1e1b4b → #065f46, map-pin
// glyph in #f5d67b, dark warm background.

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const SITE_NAME = "StartupsMap.in";
const TAGLINE = "Discover Startups Across Delhi NCR";

export const alt = "StartupsMap.in — Discover Startups Across Delhi NCR";

const BRAND_TILE = 320;

const ACCENT = "#f5d67b";
const TEXT_COLOR = "#f5f5f5";
const SUBTLE_COLOR = "#cbd5e1";

// Satori (the renderer behind ImageResponse) supports inline SVG *shapes* but
// throws on SVG <text>: "<text> nodes are not currently supported, please
// convert them to <path>". That error aborted `next build` while prerendering
// this route, so every label below is an HTML <div> styled with CSS instead.
// Only the pin glyph stays as inline SVG, and it contains shapes exclusively.
function PinGlyph({ px, opacity = 1 }: { px: number; opacity?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke={ACCENT}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    >
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx={12} cy={10} r={3} />
    </svg>
  );
}

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          padding: "0 60px",
          // Satori has no SVG gradients here — CSS gradients render natively.
          background: "linear-gradient(135deg, #0b0b12 0%, #064e3b 100%)",
        }}
      >
        {/* brand tile — same gradient/radius/gloss as src/app/icon.svg */}
        <div
          style={{
            display: "flex",
            width: BRAND_TILE,
            height: BRAND_TILE,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 28,
            border: "3px solid rgba(255, 255, 255, 0.2)",
            background: "linear-gradient(160deg, #0b0b12 0%, #1e1b4b 50%, #065f46 100%)",
          }}
        >
          <PinGlyph px={150} />
        </div>

        {/* copy column */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 50 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: TEXT_COLOR,
              letterSpacing: -1,
              lineHeight: 1.1,
            }}
          >
            {SITE_NAME}
          </div>
          <div style={{ fontSize: 40, color: SUBTLE_COLOR, marginTop: 18 }}>{TAGLINE}</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: ACCENT,
              letterSpacing: 1.5,
              marginTop: 26,
            }}
          >
            INTERACTIVE MAP · FILTERS · DELHI NCR
          </div>
          <div
            style={{
              width: 380,
              height: 6,
              borderRadius: 3,
              background: ACCENT,
              marginTop: 30,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}

