/** Short stable fingerprint of the logo, so the browser re-downloads it only after a change. */
function fingerprint(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Address of the custom logo (served by /api/site-logo), or undefined for the built-in one. */
export function logoUrl(logo: string | undefined): string | undefined {
  return logo ? `/api/site-logo?v=${fingerprint(logo)}` : undefined;
}

/** Splits a validated `data:image/...;base64,...` URL into its type and bytes. */
export function decodeLogo(logo: string): { type: string; bytes: Uint8Array<ArrayBuffer> } | null {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(logo);
  if (!m) return null;
  return { type: m[1], bytes: new Uint8Array(Buffer.from(m[2], "base64")) };
}
