import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHead } from "@/components/admin/section";
import { computeTranslationCoverage, flattenMessages, type LocaleCoverage } from "@/lib/admin/translation-coverage";
import { guardStaffPage } from "@/lib/auth/guard";
import en from "../../../../../messages/en.json";
import kk from "../../../../../messages/kk.json";
import ru from "../../../../../messages/ru.json";

const SHOW = 200;

export default async function Page({ params }: PageProps<"/[locale]/admin/translations">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  // Admins only: moderators get a 404 here.
  await guardStaffPage(["admin"]);
  const t = await getTranslations("admin.translations");
  const coverage = computeTranslationCoverage({ ru, kk, en });
  const flat = { ru: flattenMessages(ru), kk: flattenMessages(kk), en: flattenMessages(en) };

  function keyTable(title: string, keys: string[], lang: "kk" | "en") {
    return (
      <div key={title} className="mt-4">
        <h4 className="text-sm font-semibold">{title}</h4>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-subtle text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">{t("key")}</th>
                <th scope="col" className="px-3 py-2">{t("ruValue")}</th>
                <th scope="col" className="px-3 py-2">{t("value")}</th>
              </tr>
            </thead>
            <tbody>
              {keys.slice(0, SHOW).map((k) => (
                <tr key={k} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-mono text-xs break-all">{k}</td>
                  <td className="px-3 py-2">{flat.ru[k]}</td>
                  <td className="px-3 py-2">{flat[lang][k] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {keys.length > SHOW && <p className="mt-2 text-sm text-muted">{t("showing", { shown: SHOW, count: keys.length })}</p>}
      </div>
    );
  }

  function localeBlock(lang: "kk" | "en", c: LocaleCoverage) {
    const clean = c.missing.length + c.identical.length + c.extra.length === 0;
    return (
      <section key={lang} aria-labelledby={`tr-${lang}`} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h3 id={`tr-${lang}`} className="font-display text-lg font-semibold tracking-tight">{t(lang)}</h3>
        <p className="mt-2 text-sm text-muted">
          {t("missing", { count: c.missing.length })} · {t("identical", { count: c.identical.length })} · {t("extra", { count: c.extra.length })}
        </p>
        {clean && <p className="mt-2 text-sm">{t("ok")}</p>}
        {c.missing.length > 0 && keyTable(t("missing", { count: c.missing.length }), c.missing, lang)}
        {c.identical.length > 0 && keyTable(t("identical", { count: c.identical.length }), c.identical, lang)}
        {c.extra.length > 0 && keyTable(t("extra", { count: c.extra.length }), c.extra, lang)}
      </section>
    );
  }

  return (
    <>
      <SectionHead title={t("title")} lead={t("lead")}>
        <p className="mt-2 text-sm font-medium">{t("total", { count: coverage.total })}</p>
      </SectionHead>
      <div className="grid gap-4">
        {localeBlock("kk", coverage.kk)}
        {localeBlock("en", coverage.en)}
      </div>
    </>
  );
}
