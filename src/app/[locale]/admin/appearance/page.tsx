import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppearanceForm } from "@/components/admin/appearance-form";
import { SectionHead } from "@/components/admin/section";
import { guardStaffPage } from "@/lib/auth/guard";
import { DEFAULT_TEAM_CONTACT } from "@/lib/site-settings/contact";
import { LANDING_KEYS, parseStoredSettings } from "@/lib/site-settings/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import en from "../../../../../messages/en.json";
import kk from "../../../../../messages/kk.json";
import ru from "../../../../../messages/ru.json";

function pick(obj: unknown, path: string): string {
  const v = path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
  return typeof v === "string" ? v : "";
}

export default async function Page({ params }: PageProps<"/[locale]/admin/appearance">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  // Admins only: moderators get a 404 here (the save action checks the role again).
  await guardStaffPage(["admin"]);
  const t = await getTranslations("admin.appearance");

  // Fresh read (not the public cache), so the form always shows what is saved right now.
  const client = await createSupabaseServerClient();
  const { data } = await client.from("site_settings").select("data").eq("id", "site").maybeSingle();
  const current = parseStoredSettings(data?.data);

  const landingDefaults = Object.fromEntries(
    (["ru", "kk", "en"] as const).map((l) => [l, Object.fromEntries(LANDING_KEYS.map((k) => [k, pick({ ru, kk, en }[l].landing, k)]))]),
  ) as Record<"ru" | "kk" | "en", Record<string, string>>;

  return (
    <>
      <SectionHead title={t("title")} lead={t("lead")} />
      <AppearanceForm
        current={current}
        defaults={{
          colors: { primary: "#155eef", accent: "#155eef", navy: "#102a56" },
          contact: { phone: DEFAULT_TEAM_CONTACT.phone, instagram: DEFAULT_TEAM_CONTACT.instagram, email: DEFAULT_TEAM_CONTACT.email?.email ?? "" },
          landing: landingDefaults,
        }}
      />
    </>
  );
}
