import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import ru from "../messages/ru.json";
import kk from "../messages/kk.json";
import en from "../messages/en.json";
import { OpportunitiesExplorer } from "@/components/opportunities/opportunities-explorer";
import { StoriesExplorer } from "@/components/stories/stories-explorer";
import { SubmitStoryForm } from "@/components/stories/submit-story-form";
import { ExperimentsExplorer } from "@/components/try/experiments-explorer";
import { bundledExperiments, bundledOpportunities, bundledStories } from "@/lib/data/local-content";
import { buildExperimentRelations } from "@/lib/experiments/relations";
import { toExperimentView } from "@/lib/experiments/view";

type Messages = typeof ru;
const render = (locale: "ru" | "kk" | "en", messages: Messages, node: React.ReactNode) =>
  renderToString(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Almaty">
      {node}
    </NextIntlClientProvider>,
  );
const hiddenStyle = /opacity:\s*0(?![.\d])/;
const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'");

describe("Task 6 pages: server HTML", () => {
  it("/stories lists every story with its kind badge and the filters", () => {
    const html = render("ru", ru, <StoriesExplorer stories={bundledStories} />);
    for (const s of bundledStories) expect(html).toContain(`/stories/${s.id}`);
    expect(html).toContain(ru.storyKind.demo);
    for (const key of ["filterCategory", "filterInterest", "filterChallenge", "filterAge", "filterKind"] as const) {
      expect(html).toContain(ru.stories[key]);
    }
    expect(html).toContain(`Найдено: ${bundledStories.length} из ${bundledStories.length}`);
    expect(html).not.toMatch(hiddenStyle);
  });

  // The bundled entries are all unverified (their facts have not been checked by a human yet). These
  // tests use a copy marked verified on 2026-11-17 to check how the page shows a verified / old date.
  const verifiedCopy = bundledOpportunities.map((o) => ({ ...o, status: "verified" as const, verifiedAt: "2026-11-17" }));

  it("/opportunities shows every bundled entry as unverified (no verified badge)", () => {
    const html = render("ru", ru, <OpportunitiesExplorer opportunities={bundledOpportunities} serverDay="2026-11-18" />);
    expect(html).toContain(ru.opportunities.statusUnverified);
    expect(html).not.toContain("Проверено 17 ноября 2026");
    expect(html).toContain(ru.opportunities.deadlineUnknown);
  });

  it("/opportunities renders cards with the verified badge, an honest deadline and safe external links", () => {
    const html = render("ru", ru, <OpportunitiesExplorer opportunities={verifiedCopy} serverDay="2026-11-18" />);
    expect(html).toContain("Проверено 17 ноября 2026");
    expect(html).toContain(ru.opportunities.deadlineUnknown);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).not.toContain("Устарело</span>");
  });

  it("/opportunities marks old verifications as outdated (computed from the date)", () => {
    const html = render("ru", ru, <OpportunitiesExplorer opportunities={verifiedCopy} serverDay="2027-06-01" />);
    expect(html).toContain("Устарело");
    expect(html).not.toContain("Проверено 17 ноября 2026");
  });

  it("/try renders the experiments with time, difficulty and the start button", () => {
    const views = bundledExperiments.map((e) => toExperimentView(e, "en"));
    const html = render("en", en, <ExperimentsExplorer experiments={views} relations={buildExperimentRelations(bundledExperiments)} />);
    for (const e of bundledExperiments) expect(html).toContain(`id="${e.id}"`);
    expect(unescape(html)).toContain(en.try.start);
    expect(html).toContain(en.try.time);
    expect(html).toContain(en.try.difficulty);
    expect(html).not.toMatch(hiddenStyle);
  });

  it("/stories/submit shows the required consent text and no success state", () => {
    const html = render("ru", ru, <SubmitStoryForm />);
    expect(html).toContain("Я согласен(на) на публикацию после модерации и подтверждаю, что это моя история");
    expect(html).toContain(ru.stories.formSubmit);
    expect(html).not.toContain("Спасибо! История появится после модерации.");
  });

  it("renders in kk and en without missing messages", () => {
    expect(render("kk", kk, <StoriesExplorer stories={bundledStories} />)).toContain(kk.stories.filterCategory);
    expect(render("en", en, <SubmitStoryForm />)).toContain(en.stories.formSubmit);
    expect(render("kk", kk, <OpportunitiesExplorer opportunities={bundledOpportunities} serverDay="2026-11-18" />)).toContain(kk.opportunities.deadlineUnknown);
  });

  it("uses the exact required Russian copy", () => {
    expect(ru.try.philosophy).toBe("Тебе не нужно выбирать всё будущее сегодня. Сначала можно попробовать.");
    expect(ru.try.keyQuestion).toBe("Тебе понравился сам процесс или только идея этим заниматься?");
    expect(ru.stories.api.localMode).toBe("Отправка историй заработает после подключения базы данных");
    expect(ru.stories.reportLocal).toBe("Жалобы заработают после подключения базы");
    expect(ru.stories.successTitle).toBe("Спасибо! История появится после модерации.");
    expect(ru.opportunities.deadlineUnknown).toBe("Дедлайн уточняйте на официальном сайте");
    expect(ru.opportunities.statusUnverified).toBe("Не проверено");
    expect(ru.opportunities.statusOutdated).toBe("Устарело");
    expect(ru.try.similarTitle).toBe("Похожие эксперименты");
  });
});
