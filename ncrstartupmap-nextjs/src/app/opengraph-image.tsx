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

const BRAND_TILE_WIDTH = 320;
const BRAND_TILE_HEIGHT = 320;

function pinPath(accent: string) {
  return (
    <g
      transform={`translate(${BRAND_TILE_WIDTH / 2} ${BRAND_TILE_HEIGHT / 2} -12 -12) scale(6) translate(-12 -12)`}
      fill="none"
      stroke={accent}
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx={12} cy={10} r={3} />
    </g>
  );
}

function brandTile(accent: string, tileTop: string, tileMid: string, tileBot: string) {
  const w = BRAND_TILE_WIDTH;
  const h = BRAND_TILE_HEIGHT;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="tile" x1={0} y1={0} x2={w} y2={h} gradientUnits="userSpaceOnUse">
          <stop offset={0} stopColor={tileTop} />
          <stop offset={0.5} stopColor={tileMid} />
          <stop offset={1} stopColor={tileBot} />
        </linearGradient>
        <linearGradient id="gloss" x1={0} y1={0} x2={0} y2={h} gradientUnits="userSpaceOnUse">
          <stop offset={0} stopColor="#ffffff" stopOpacity={0.25} />
          <stop offset={0.5} stopColor="#ffffff" stopOpacity={0.1} />
          <stop offset={1} stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect width={w} height={h} rx={28} fill="url(#tile)" />
      <rect width={w} height={h} rx={28} fill="url(#gloss)" />
      <rect x={3} y={3} width={w - 6} height={h - 6} rx={25} fill="none" stroke="#ffffff" strokeOpacity={0.2} strokeWidth={3} />
      {pinPath(accent)}
    </svg>
  );
}

export default async function ImageSVG() {
  const accent = "#f5d67b";
  const tileTop = "#0b0b12";
  const tileMid = "#1e1b4b";
  const tileBot = "#065f46";
  const textColor = "#f5f5f5";
  const subColor = "#cbd5e1";
  const bgTop = "#0b0b12";
  const bgBot = "#064e3b";

  const layout = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={1200}
      height={630}
      viewBox="0 0 1200 630"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="bg" x1={0} y1={0} x2={1200} y2={630} gradientUnits="userSpaceOnUse">
          <stop offset={0} stopColor={bgTop} />
          <stop offset={1} stopColor={bgBot} />
        </linearGradient>
      </defs>
      <rect width={1200} height={630} fill="url(#bg)" />

      {/* brand tile, left, vertically centered */}
      <g transform="translate(60 155)">
        {brandTile(accent, tileTop, tileMid, tileBot)}
      </g>

      {/* title */}
      <text
        x={430}
        y={230}
        fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fontSize={72}
        fontWeight={700}
        fill={textColor}
        letterSpacing={-1}
      >
        {SITE_NAME}
      </text>

      {/* tagline */}
      <text
        x={430}
        y={310}
        fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fontSize={40}
        fontWeight={400}
        fill={subColor}
      >
        {TAGLINE}
      </text>

      {/* meta row */}
      <text
        x={430}
        y={370}
        fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fontSize={22}
        fontWeight={500}
        fill={accent}
        letterSpacing={1.5}
      >
        INTERACTIVE MAP · FILTERS · DELHI NCR
      </text>

      {/* accent line */}
      <rect x={430} y={400} width={380} height={6} rx={3} fill={accent} />

      {/* small pin accent bottom-right */}
      <g
        transform="translate(1080 540) scale(1.6)"
        fill="none"
        stroke={accent}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      >
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <circle cx={12} cy={10} r={3} />
      </g>
    </svg>
  );

  return new ImageResponse(layout, {
    width: 1200,
    height: 630,
  });
}

