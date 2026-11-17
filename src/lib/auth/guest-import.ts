import { SAVED_KINDS, type Roadmap, type UserStore } from "@/lib/data/types";

/** What one import run actually wrote. Everything is 0 / false when nothing was new. */
export interface ImportSummary {
  /** The questionnaire session was copied (only when the account had none). */
  session: boolean;
  reports: number;
  journal: number;
  /** Saved stories, opportunities and directions. */
  saved: number;
  completions: number;
  /** The standalone roadmap was copied (only when the account had none). */
  roadmap: boolean;
}

const emptyRoadmap = (r: Roadmap) => r.d7.length + r.d30.length + r.d90.length === 0;

/** True when this device holds something worth offering to import. */
export async function hasGuestData(local: UserStore): Promise<boolean> {
  const [session, reports, journal, completions, roadmap, ...saved] = await Promise.all([
    local.loadSession(),
    local.listReports(),
    local.listJournal(),
    local.listCompletions(),
    local.getRoadmap(),
    ...SAVED_KINDS.map((k) => local.listSaved(k)),
  ]);
  return (
    (session?.answers.length ?? 0) > 0 ||
    reports.length > 0 ||
    journal.length > 0 ||
    completions.length > 0 ||
    !emptyRoadmap(roadmap) ||
    saved.some((ids) => ids.length > 0)
  );
}

/**
 * Copies this device's data (`local`) into the signed-in account (`remote`).
 * Idempotent and non-destructive, so it is safe to run twice:
 * - items are matched by id; ones the account already has are left alone (the account wins)
 * - saved items are only added when missing (`toggleSaved` would otherwise un-save them)
 * - the questionnaire session and the roadmap are copied only when the account has none
 * - nothing is deleted from this device
 * Not imported: chat memory and its consent setting (a privacy choice the person makes in settings).
 */
export async function importGuestData(local: UserStore, remote: UserStore): Promise<ImportSummary> {
  const summary: ImportSummary = { session: false, reports: 0, journal: 0, saved: 0, completions: 0, roadmap: false };

  const [localSession, remoteSession] = await Promise.all([local.loadSession(), remote.loadSession()]);
  if (localSession && localSession.answers.length > 0 && !remoteSession) {
    await remote.saveSession(localSession);
    summary.session = true;
  }

  const remoteReportIds = new Set((await remote.listReports()).map((r) => r.id));
  // Oldest first, so the newest report is written last and keeps its place at the top.
  for (const report of [...(await local.listReports())].reverse()) {
    if (remoteReportIds.has(report.id)) continue;
    await remote.saveReport(report);
    summary.reports += 1;
  }

  const remoteJournalIds = new Set((await remote.listJournal()).map((e) => e.id));
  for (const entry of await local.listJournal()) {
    if (remoteJournalIds.has(entry.id)) continue;
    await remote.saveJournal(entry);
    summary.journal += 1;
  }

  for (const kind of SAVED_KINDS) {
    const have = new Set(await remote.listSaved(kind));
    for (const id of await local.listSaved(kind)) {
      if (have.has(id)) continue;
      await remote.toggleSaved(kind, id);
      summary.saved += 1;
    }
  }

  const remoteCompletionIds = new Set((await remote.listCompletions()).map((c) => c.experimentId));
  for (const completion of await local.listCompletions()) {
    if (remoteCompletionIds.has(completion.experimentId)) continue;
    await remote.saveCompletion(completion);
    summary.completions += 1;
  }

  const [localRoadmap, remoteRoadmap] = await Promise.all([local.getRoadmap(), remote.getRoadmap()]);
  if (!emptyRoadmap(localRoadmap) && emptyRoadmap(remoteRoadmap)) {
    await remote.saveRoadmap(localRoadmap);
    summary.roadmap = true;
  }

  return summary;
}
