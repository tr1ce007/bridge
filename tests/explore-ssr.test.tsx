import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import ru from "../messages/ru.json";
import { ExploreFlow } from "@/components/explore/explore-flow";
import { fetchFollowUp } from "@/lib/questionnaire/follow-up";

describe("/explore server HTML", () => {
  it("renders the page shell and a loading state, with nothing hidden", async () => {
    const html = renderToString(
      <NextIntlClientProvider locale="ru" messages={ru} timeZone="Asia/Almaty">
        <ExploreFlow />
      </NextIntlClientProvider>,
    );
    expect(html).toContain(ru.explore.eyebrow);
    expect(html).toContain(ru.explore.loading);
    expect(html).not.toMatch(/opacity:\s*0(?![.\d])/);
  });

  it("the default AI follow-up hook is a no-op until Task 4 plugs one in", async () => {
    expect(await fetchFollowUp([])).toBeNull();
  });
});
