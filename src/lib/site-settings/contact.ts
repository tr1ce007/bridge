import { contactInfo, TEAM_CONTACT, type ContactInfo } from "@/lib/contact";
import type { SiteSettings } from "./schema";

/** How to reach the team, after the editor's changes (each field falls back to the built-in value). */
export interface TeamContact {
  phone: string;
  phoneHref: string;
  instagram: string;
  instagramHref: string;
  instagramDmHref: string;
  /** null: no address anywhere (pages say a contact will appear instead). */
  email: ContactInfo | null;
}

export const DEFAULT_TEAM_CONTACT: TeamContact = { ...TEAM_CONTACT, email: contactInfo() };

export function teamContact(contact: SiteSettings["contact"] = {}): TeamContact {
  const out: TeamContact = { ...DEFAULT_TEAM_CONTACT };
  if (contact.phone) {
    out.phone = contact.phone;
    out.phoneHref = `tel:${contact.phone.startsWith("+") ? "+" : ""}${contact.phone.replace(/\D/g, "")}`;
  }
  if (contact.instagram) {
    out.instagram = `@${contact.instagram}`;
    out.instagramHref = `https://www.instagram.com/${contact.instagram}/`;
    out.instagramDmHref = `https://ig.me/m/${contact.instagram}`;
  }
  if (contact.email) out.email = contactInfo(contact.email);
  return out;
}
