"use client";

import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { IDLE } from "@/lib/admin/action-state";
import { saveAppearanceAction } from "@/lib/site-settings/actions";
import { contrast, MIN_TEXT_CONTRAST, WHITE } from "@/lib/site-settings/color";
import { LANDING_KEYS, LANDING_TEXT_MAX, LOGO_MAX_CHARS, SETTINGS_LOCALES, type SettingsLocale, type SiteSettings } from "@/lib/site-settings/schema";
import { themeVars } from "@/lib/site-settings/theme";
import { fieldClass, ResultNote } from "./result-note";

type ColorKey = "primary" | "accent" | "navy";
const COLOR_KEYS: readonly ColorKey[] = ["primary", "accent", "navy"];
const HEX = /^#[0-9a-fA-F]{6}$/;

type Defaults = {
  colors: Record<ColorKey, string>;
  contact: { phone: string; instagram: string; email: string };
  landing: Record<SettingsLocale, Record<string, string>>;
};

/** Home-page sections in page order (first part of the `landing.*` key). */
const SECTIONS = [...new Set(LANDING_KEYS.map((k) => k.split(".")[0]))];

/** Resizes an image file to a 256 px square (centre crop) and returns it as a data URL. */
async function resizeLogo(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  const webp = canvas.toDataURL("image/webp", 0.9);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

export function AppearanceForm({ current, defaults }: { current: SiteSettings; defaults: Defaults }) {
  const t = useTranslations("admin.appearance");
  const c = useTranslations("admin.common");
  const [state, action, pending] = useActionState(saveAppearanceAction, IDLE);

  const [colors, setColors] = useState<Record<ColorKey, string>>({
    primary: current.colors.primary ?? "",
    accent: current.colors.accent ?? "",
    navy: current.colors.navy ?? "",
  });
  const [contact, setContact] = useState({
    phone: current.contact.phone ?? "",
    instagram: current.contact.instagram ? `@${current.contact.instagram}` : "",
    email: current.contact.email ?? "",
  });
  const [landing, setLanding] = useState<Record<SettingsLocale, Record<string, string>>>({
    ru: { ...current.landing.ru },
    kk: { ...current.landing.kk },
    en: { ...current.landing.en },
  });
  const [lang, setLang] = useState<SettingsLocale>("ru");
  const [logo, setLogo] = useState<string | undefined>(current.logo);
  const [logoError, setLogoError] = useState(false);

  /** The object the server validates: empty fields are left out (they keep the built-in value). */
  const settings = useMemo(() => {
    const clean = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v.trim() !== "").map(([k, v]) => [k, v.trim()]));
    const landingOut = Object.fromEntries(SETTINGS_LOCALES.map((l) => [l, clean(landing[l])]).filter(([, v]) => Object.keys(v).length));
    return {
      colors: clean(colors),
      contact: clean(contact),
      landing: landingOut,
      ...(logo ? { logo } : {}),
    };
  }, [colors, contact, landing, logo]);

  const effective = (k: ColorKey) => (HEX.test(colors[k]) ? colors[k].toLowerCase() : defaults.colors[k]);
  const preview = themeVars({ primary: effective("primary"), accent: effective("accent"), navy: effective("navy") }).light as CSSProperties;
  const lowContrast = (k: ColorKey) => k !== "accent" && HEX.test(colors[k]) && contrast(colors[k], WHITE) < MIN_TEXT_CONTRAST;
  const bad = (f: string) => (state.status === "error" && state.fields?.some((x) => x === f || x.startsWith(`${f}.`))) || undefined;
  const anyLowContrast = COLOR_KEYS.some(lowContrast);

  return (
    <form action={action} className="space-y-12">
      <input type="hidden" name="settings" value={JSON.stringify(settings)} />

      {/* ---------------------------------------------------------------- colours */}
      <section aria-labelledby="ap-colors" className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 id="ap-colors" className="font-display text-xl font-semibold tracking-tight">{t("colors.title")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("colors.lead")}</p>
          <div className="mt-6 space-y-5">
            {COLOR_KEYS.map((k) => (
              <div key={k}>
                <label htmlFor={`ap-color-${k}`} className="text-sm font-medium">
                  {t(`colors.${k}`)}
                </label>
                <p className="text-sm text-muted">{t(`colors.${k}Help`)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    aria-label={t(`colors.${k}`)}
                    value={effective(k)}
                    onChange={(e) => setColors((s) => ({ ...s, [k]: e.target.value }))}
                    className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-bg p-1"
                  />
                  <input
                    id={`ap-color-${k}`}
                    value={colors[k]}
                    placeholder={defaults.colors[k]}
                    onChange={(e) => setColors((s) => ({ ...s, [k]: e.target.value }))}
                    maxLength={7}
                    aria-invalid={bad(`colors.${k}`) || lowContrast(k) || (colors[k] !== "" && !HEX.test(colors[k])) || undefined}
                    className={`${fieldClass} mt-0 w-32 font-mono`}
                  />
                  {colors[k] && (
                    <button type="button" onClick={() => setColors((s) => ({ ...s, [k]: "" }))} className="min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]">
                      {t("reset")}
                    </button>
                  )}
                </div>
                {lowContrast(k) && (
                  <p role="alert" className="mt-1.5 text-sm font-medium text-red-700 dark:text-red-400">
                    {t("colors.lowContrast")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div aria-label={t("colors.preview")} style={preview} className="self-start overflow-hidden rounded-3xl border border-border">
          <div className="bg-white p-6 text-[#152238]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent-text)" }}>
              <span aria-hidden="true" className="mr-2 inline-block h-px w-6 align-middle" style={{ background: "var(--accent)" }} />
              {t("colors.previewEyebrow")}
            </p>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{t("colors.previewTitle")}</p>
            <span className="mt-5 inline-flex min-h-11 items-center rounded-full px-5 font-semibold text-white" style={{ background: "var(--primary)" }}>
              {t("colors.previewButton")}
            </span>
          </div>
          <div className="p-6 text-white" style={{ background: "var(--brand-navy, var(--navy))" }}>
            <span aria-hidden="true" className="block h-0.5 w-12 rounded-full" style={{ background: "var(--brand-line, var(--accent))" }} />
            <p className="mt-4 font-display text-xl font-semibold">{t("colors.previewBand")}</p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- logo */}
      <section aria-labelledby="ap-logo">
        <h3 id="ap-logo" className="font-display text-xl font-semibold tracking-tight">{t("logo.title")}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t("logo.lead")}</p>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <span className="relative block size-16 overflow-hidden rounded-full bg-white ring-1 ring-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo ?? "/brand/logo.jpg"} alt={t("logo.previewAlt")} className="size-full object-cover" />
          </span>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border px-5 text-sm font-semibold hover:border-border-strong">
            {t("logo.upload")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const url = await resizeLogo(file);
                  setLogoError(url.length > LOGO_MAX_CHARS);
                  if (url.length <= LOGO_MAX_CHARS) setLogo(url);
                } catch {
                  setLogoError(true);
                }
              }}
            />
          </label>
          {logo && (
            <button type="button" onClick={() => setLogo(undefined)} className="min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline dark:text-[var(--ring)]">
              {t("logo.remove")}
            </button>
          )}
        </div>
        {logoError && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-700 dark:text-red-400">
            {t("logo.error")}
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------- contacts */}
      <section aria-labelledby="ap-contact">
        <h3 id="ap-contact" className="font-display text-xl font-semibold tracking-tight">{t("contact.title")}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t("contact.lead")}</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {(["phone", "instagram", "email"] as const).map((k) => (
            <div key={k}>
              <label htmlFor={`ap-contact-${k}`} className="text-sm font-medium">
                {t(`contact.${k}`)}
              </label>
              <input
                id={`ap-contact-${k}`}
                type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
                value={contact[k]}
                placeholder={defaults.contact[k] || t("contact.emailNone")}
                maxLength={120}
                onChange={(e) => setContact((s) => ({ ...s, [k]: e.target.value }))}
                aria-invalid={bad(`contact.${k}`)}
                className={fieldClass}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- home-page texts */}
      <section aria-labelledby="ap-texts">
        <h3 id="ap-texts" className="font-display text-xl font-semibold tracking-tight">{t("texts.title")}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t("texts.lead")}</p>
        <div role="group" aria-label={t("texts.language")} className="mt-5 flex gap-2">
          {SETTINGS_LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={`min-h-11 rounded-full border px-5 text-sm font-semibold ${lang === l ? "border-primary bg-primary text-primary-fg" : "border-border hover:border-border-strong"}`}
            >
              {t(`texts.lang.${l}`)}
            </button>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {SECTIONS.map((section) => {
            const keys = LANDING_KEYS.filter((k) => k.startsWith(`${section}.`));
            const changed = keys.filter((k) => landing[lang][k]?.trim()).length;
            return (
              <details key={section} className="group rounded-2xl border border-border bg-card">
                <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-5 py-3 font-semibold">
                  <span>{t(`texts.sections.${section}` as "texts.sections.hero")}</span>
                  {changed > 0 && <span className="text-sm font-normal text-muted">{t("texts.changed", { count: changed })}</span>}
                </summary>
                <div className="space-y-4 border-t border-border px-5 py-5">
                  {keys.map((k) => {
                    const id = `ap-text-${lang}-${k.replace(/\./g, "-")}`;
                    const def = defaults.landing[lang][k] ?? "";
                    return (
                      <div key={k}>
                        <label htmlFor={id} className="font-mono text-xs text-muted">
                          {k}
                        </label>
                        <textarea
                          id={id}
                          rows={def.length > 90 ? 3 : 1}
                          value={landing[lang][k] ?? ""}
                          placeholder={def}
                          maxLength={LANDING_TEXT_MAX}
                          onChange={(e) => setLanding((s) => ({ ...s, [lang]: { ...s[lang], [k]: e.target.value } }))}
                          aria-invalid={bad(`landing.${lang}.${k}`) || /[{}<>]/.test(landing[lang][k] ?? "") || undefined}
                          className={`${fieldClass} py-2.5 leading-relaxed`}
                        />
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-muted">{t("texts.help")}</p>
      </section>

      {/* ---------------------------------------------------------------- save */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-border bg-bg/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <Button type="submit" disabled={pending || anyLowContrast}>
          {pending ? c("saving") : c("save")}
        </Button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(t("resetAllConfirm"))) return;
            setColors({ primary: "", accent: "", navy: "" });
            setContact({ phone: "", instagram: "", email: "" });
            setLanding({ ru: {}, kk: {}, en: {} });
            setLogo(undefined);
          }}
          className="min-h-11 text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          {t("resetAll")}
        </button>
        <ResultNote state={state} ns="appearance" />
      </div>
    </form>
  );
}
