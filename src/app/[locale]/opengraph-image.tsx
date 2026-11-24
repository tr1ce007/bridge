import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Link preview for chats and social networks (WhatsApp, Instagram, Telegram). Latin text only, so the
// built-in font is enough; the drawing repeats the site's suspension-bridge line.
export const alt = "THE BRIDGE";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRIDGE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 214" fill="none">
  <path d="M0 170 Q150 110 300 20 Q600 260 900 20 Q1050 110 1200 170" stroke="#3b7bf6" stroke-width="4"/>
  <line x1="295" y1="10" x2="295" y2="206" stroke="#ffffff" stroke-opacity="0.85" stroke-width="4"/>
  <line x1="305" y1="10" x2="305" y2="206" stroke="#ffffff" stroke-opacity="0.85" stroke-width="4"/>
  <line x1="895" y1="10" x2="895" y2="206" stroke="#ffffff" stroke-opacity="0.85" stroke-width="4"/>
  <line x1="905" y1="10" x2="905" y2="206" stroke="#ffffff" stroke-opacity="0.85" stroke-width="4"/>
  <line x1="0" y1="170" x2="1200" y2="170" stroke="#ffffff" stroke-width="5"/>
  <circle cx="1188" cy="170" r="12" fill="#3b7bf6"/>
</svg>`;

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/brand/logo.jpg"));
  const logoSrc = `data:image/jpeg;base64,${logo.toString("base64")}`;
  const bridgeSrc = `data:image/svg+xml;base64,${Buffer.from(BRIDGE).toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#102a56",
          padding: "64px 72px 48px",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
          <img src={logoSrc} width={96} height={96} alt="" style={{ borderRadius: 48, objectFit: "cover" }} />
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: 6 }}>THE BRIDGE</div>
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "rgba(255,255,255,0.8)", maxWidth: 900, lineHeight: 1.35 }}>
          Explore your path: questionnaire, real stories, small experiments, scholarships.
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
        <img src={bridgeSrc} width={1056} height={188} alt="" />
      </div>
    ),
    size,
  );
}
