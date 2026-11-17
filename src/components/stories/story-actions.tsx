"use client";

import { useTranslations } from "next-intl";
import { SaveButton } from "@/components/ui/save-button";
import { useSaved } from "@/hooks/use-saved";
import { ReportStory } from "./report-story";

/** Detail page island: save toggle and report button (saved state lives in the user's store). */
export function StoryActions({ storyId, title }: { storyId: string; title: string }) {
  const t = useTranslations("stories");
  const ts = useTranslations("states");
  const saved = useSaved("story");
  const isSaved = saved.ids.includes(storyId);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <SaveButton
          saved={isSaved}
          disabled={saved.status === "loading"}
          onToggle={() => void saved.toggle(storyId)}
          labelSave={t("save")}
          labelSaved={t("saved")}
          ariaLabel={isSaved ? t("unsaveAria", { title }) : t("saveAria", { title })}
        />
        <ReportStory storyId={storyId} />
      </div>
      {(saved.saveFailed || saved.memoryOnly || saved.status === "error") && (
        <p role="status" className="text-sm text-muted">
          {saved.saveFailed ? ts("saveFailed") : saved.status === "error" ? ts("savedLoadFailed") : ts("memoryNotice")}
        </p>
      )}
    </div>
  );
}
