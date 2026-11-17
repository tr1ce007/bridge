import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ModerationCard } from "@/components/admin/moderation-card";
import { Empty, SectionHead } from "@/components/admin/section";
import { listPendingStories } from "@/lib/admin/queries";
import { guardStaffPage } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page({ params }: PageProps<"/[locale]/admin/stories">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await guardStaffPage();
  const t = await getTranslations("admin.stories");
  const { items, unreadable } = await listPendingStories(await createSupabaseServerClient());
  return (
    <>
      <SectionHead title={t("title")} lead={t("lead")} />
      {unreadable > 0 && (
        <p role="note" className="mb-4 rounded-2xl border border-amber-600/40 bg-subtle p-4 text-sm">
          {t("unreadable", { count: unreadable })}
        </p>
      )}
      {items.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <div className="grid gap-5">
          {items.map((i) => (
            <ModerationCard key={i.story.id} story={i.story} createdAt={i.createdAt} consentAt={i.consentAt} />
          ))}
        </div>
      )}
    </>
  );
}
