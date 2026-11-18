/**
 * The team's contact address. It comes only from the optional env var NEXT_PUBLIC_CONTACT_EMAIL.
 * When it is not set there is no address anywhere in the product (we never invent one): pages say
 * that a contact will appear instead.
 */
export interface ContactInfo {
  email: string;
  href: string;
}

/** The team's public phone and Instagram, given by the team (always shown). */
export const TEAM_CONTACT = {
  phone: "+7 (776) 914 07 20",
  phoneHref: "tel:+77769140720",
  instagram: "@the.bridge.astana",
  instagramHref: "https://www.instagram.com/the.bridge.astana/",
  /** Opens a direct message to the team's Instagram. */
  instagramDmHref: "https://ig.me/m/the.bridge.astana",
} as const;

// Deliberately simple: one "@", no spaces or angle brackets, a dot in the domain.
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

/** `raw` defaults to the env var (read as a literal so Next.js can inline it for the browser). */
export function contactInfo(raw: string | undefined = process.env.NEXT_PUBLIC_CONTACT_EMAIL): ContactInfo | null {
  const email = raw?.trim();
  if (!email || !EMAIL.test(email)) return null;
  return { email, href: `mailto:${email}` };
}
