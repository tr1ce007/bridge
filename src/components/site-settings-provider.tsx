"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_TEAM_CONTACT, type TeamContact } from "@/lib/site-settings/contact";

type Value = { contact: TeamContact; logo?: string };

// Without a provider (tests, isolated renders) the built-in contacts and logo are used.
const SiteSettingsContext = createContext<Value>({ contact: DEFAULT_TEAM_CONTACT });

/** Puts the editor's contacts and logo where client components can read them. */
export function SiteSettingsProvider({ value, children }: { value: Value; children: ReactNode }) {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useTeamContact(): TeamContact {
  return useContext(SiteSettingsContext).contact;
}

/** Custom logo as a data URL, or undefined for the built-in one. */
export function useCustomLogo(): string | undefined {
  return useContext(SiteSettingsContext).logo;
}
