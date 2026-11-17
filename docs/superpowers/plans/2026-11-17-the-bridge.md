# THE BRIDGE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build THE BRIDGE — a trilingual Next.js platform whose core is an AI life-path explorer (adaptive questionnaire → discovery report), plus chat, experiments, stories, opportunities, dashboard, Supabase backend and admin.

**Architecture:** Next.js App Router with `[locale]` segment (next-intl). A `DataStore` interface with two adapters (Supabase / local browser+JSON) and an `AIProvider` interface with three implementations (Anthropic, OpenAI-compatible, `demo` rule-based fallback). All AI calls live in route handlers under `app/api/*`; pure logic (question engine, story matcher, fallback report) lives in `lib/` and is unit-tested with Vitest.

**Tech Stack:** Next.js 15+, React 19, TypeScript, Tailwind CSS 4, Framer Motion, next-intl, zod, @supabase/ssr + @supabase/supabase-js, @anthropic-ai/sdk, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-the-bridge-design.md`

## Global Constraints

- All work inside `/Users/ilyas/Desktop/claude.md/the-bridge/`; never touch sibling files.
- Locales: `ru` (default), `kk`, `en`; all UI copy in `messages/{ru,kk,en}.json`, no hard-coded UI strings in components.
- Brand: primary `#1F4E9C`, accent `#B8935A`; fonts Manrope (headings) + Inter (body), `cyrillic-ext` subset.
- Story `kind` ∈ `verified | documented | user | demo`; every card shows its badge; `demo` = "Демонстрационный пример (вымышлен)".
- Relevance shown as `low | medium | high`, never percentages.
- AI default model `claude-sonnet-5-5`; keys only via server env; `AI_PROVIDER` ∈ `anthropic | openai | demo`, auto `demo` when key missing; demo mode always visibly labeled.
- No invented statistics, deadlines, eligibility or stories. Unverified deadline → "уточняйте на официальном сайте". Stats without found source → "источник уточняется".
- Questionnaire: 15–30 questions; report blocked until required blocks A, B, C, E, F answered.
- Never phrase output as destiny ("тебе суждено"); ethics rules in every system prompt.
- No git repo exists: commit steps are replaced by `npm run build` passing.

## Review Focus

1. User closes tab mid-questionnaire and returns → progress restored from storage, can edit earlier answer. (Task 3 test `resumes session`.)
2. AI provider errors / times out / returns invalid JSON → falls back to demo report, logs failure, UI shows notice, not a crash. (Task 4 test `falls back on invalid json`.)
3. Story or user text containing "ignore previous instructions" → passed to model inside a delimited data block and stripped of markup. (Task 4 test `wraps stories as data`.)
4. Locale switch on any page keeps the same route and loads a complete dictionary (no missing keys in kk/en). (Task 1 test `dictionaries have identical keys`.)
5. Local storage unavailable (private mode) → app still renders, data held in memory with notice. (Task 2 test `memory fallback`.)

---

### Task 1: Scaffold, design system, i18n, theme, landing

**Files:**
- Create: project via `create-next-app` (TS, Tailwind, App Router, `src/`), `src/i18n/{routing,request}.ts`, `src/middleware.ts`, `messages/{ru,kk,en}.json`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/components/{site-header,site-footer,theme-toggle,locale-switcher,logo,bridge-line}.tsx`, `src/components/landing/*.tsx`, `public/brand/{logo.jpg,certificate.webp,adal-azamat.png,ambassadors.webp}`, `tests/i18n.test.ts`, `vitest.config.ts`
- Copy images from `/private/tmp/claude-501/-Users-ilyas-Desktop-claude-md/c9e06fb4-266e-4951-938e-b53010390d09/images/{1.jpg,2.webp,3.png,4.webp}`.

**Interfaces:**
- Produces: `routing` (next-intl), `Link`/`useRouter` from `src/i18n/navigation.ts`; CSS tokens `--bg --fg --muted --card --border --primary --accent` on `:root` and `[data-theme=dark]`; `<Section>`, `<Button variant="primary|ghost">`, `<Badge>` in `src/components/ui/`.

- [ ] Step 1: Write `tests/i18n.test.ts` → `dictionaries have identical keys`: flatten keys of ru/kk/en, expect `kk` and `en` key sets toEqual `ru`.
- [ ] Step 2: Run `npx vitest run tests/i18n.test.ts` → FAIL (files missing).
- [ ] Step 3: Scaffold, install deps, write dictionaries and landing (hero with exact headline/subtext/CTAs from spec, problem, stats with source-or-"источник уточняется", how it works ×4, stories teaser, try-before-you-choose, opportunities, community/partners with brand images, final CTA "Your journey starts with one question").
- [ ] Step 4: `npx vitest run` → PASS; `npm run build` → success; open `/ru`, `/kk`, `/en` in browser, toggle theme.

### Task 2: Data layer (local + Supabase adapters)

**Files:** Create `src/lib/data/types.ts`, `src/lib/data/local-store.ts`, `src/lib/data/supabase-store.ts`, `src/lib/data/index.ts`, `src/lib/supabase/{client,server}.ts`, `src/content/{stories,experiments,opportunities}.json`, `supabase/migrations/0001_init.sql`, `supabase/seed.sql`, `tests/local-store.test.ts`, `.env.example`

**Interfaces:**
- Produces: types `Answer {questionId: string; value: string | string[]; skipped?: boolean}`, `QuestionnaireSession {id; answers: Answer[]; currentId: string | null; startedAt; updatedAt}`, `DiscoveryReport` (zod schema `reportSchema` in `src/lib/report/schema.ts`), `Story {id; kind; title; lang; sourceUrl?; sourceName?; attribution; publishedAt?; before; challenges; turningPoint; actions; now; advice?; tags: Record<Axis,string[]>; incomplete?: string[]}`, `Experiment`, `Opportunity {…; deadline: string|null; verifiedAt: string; status: 'verified'|'unverified'|'outdated'}`, `RoadmapItem`, `JournalEntry`.
- Produces: `getUserStore(): UserStore` with `loadSession/saveSession/listReports/saveReport/getRoadmap/saveRoadmap/listJournal/saveJournal/toggleSaved(kind,id)/listSaved(kind)/clearAll()`; `getContent(): ContentStore` with `listStories(filter)/getStory(id)/listExperiments()/listOpportunities(filter)/submitStory(input)`.
- Axis = `start | interests | fears | education | challenges | motives | decisions | transitions`.

- [ ] Step 1: Tests: `saves and loads session`, `memory fallback` (stub `localStorage` throwing → still returns saved data), `clearAll removes everything`.
- [ ] Step 2: Run → FAIL. Step 3: implement; SQL migration with all tables from spec §5 and RLS (owner-only on personal tables; stories readable when `status='approved'`; admin role via `profiles.role`). Content JSON: demo stories (kind `demo`), real opportunities with official URLs only. Step 4: tests PASS, build passes.

### Task 3: Questionnaire engine + `/explore`

**Files:** Create `src/lib/questionnaire/{bank.ts,engine.ts}`, `src/app/[locale]/explore/page.tsx`, `src/components/explore/*.tsx`, `tests/engine.test.ts`

**Interfaces:**
- Produces: `QUESTION_BANK: Question[]` (`{id; block: 'A'..'G'; required: boolean; type: 'single'|'multi'|'text'|'scale'; optionsKey?; sensitive?; showIf?(answers)}` — copy in messages under `q.<id>`), `nextQuestion(answers: Answer[]): Question | null`, `canGenerateReport(answers): {ok: boolean; missing: Block[]}`, `progress(answers): number` (0–1).

- [ ] Step 1: Tests: `starts with A1`, `skips showIf-false questions`, `never exceeds 30`, `blocks report until A,B,C,E,F answered`, `resumes session` (saved answers → nextQuestion returns first unanswered).
- [ ] Step 2: FAIL. Step 3: implement (bank ≈34 questions, adaptive branches cut to 15–30). UI: one question per screen, back/edit, skip for optional with "why we ask" for sensitive, restart, autosave, optional AI follow-up via `/api/ai/followup`. Step 4: PASS, build, walk through in browser.

### Task 4: AI layer + report

**Files:** Create `src/lib/ai/{provider.ts,anthropic.ts,openai.ts,demo.ts,prompts.ts,sanitize.ts,rate-limit.ts}`, `src/lib/report/{schema.ts,fallback.ts}`, `src/lib/matching/match.ts`, `src/app/api/ai/{report,followup,chat}/route.ts`, `src/app/[locale]/report/[id]/page.tsx`, `src/components/report/*.tsx`, `tests/{match,fallback,prompts,ai-report}.test.ts`

**Interfaces:**
- Produces: `getProvider(): AIProvider` with `generateJSON<T>(schema, messages): Promise<T>` and `streamChat(messages): ReadableStream`; `isDemoMode(): boolean`; `matchStories(answers, stories, n=5): {story, relevance: 'low'|'medium'|'high', why: string[], differences: string[]}[]`; `buildFallbackReport(answers, locale): DiscoveryReport`; `wrapAsData(label, text): string`; `rateLimit(key, limit, windowMs): boolean`.
- Report sections exactly spec §5 (startingPoint, patterns, unnoticed, directions[5–8]{name, why, supportingAnswers, difficulties, skills, howToTest, realityCheck}, stories, unexpected, experiments, roadmap{d7,d30,d90}).

- [ ] Step 1: Tests: `match ranks shared-start story above shared-profession`, `relevance is categorical`, `fallback report passes reportSchema with 5–8 directions`, `wraps stories as data` (injection text inside `<data>` tags, tags in input escaped), `falls back on invalid json` (mock provider returns garbage → route returns fallback + `demo:true`).
- [ ] Step 2: FAIL. Step 3: implement; report page with all 8 sections, story badges, editable/savable roadmap, "demo mode" banner. Step 4: PASS, build, generate a report in browser.

### Task 5: Chat "Давай разберёмся"

**Files:** Create `src/app/[locale]/chat/page.tsx`, `src/components/chat/*.tsx`.
**Interfaces:** Consumes `/api/ai/chat` (POST `{messages, locale, memoryConsent, profileSummary?}` → text stream). Memory stored only when consent toggle on.
- [ ] Steps: starter prompts from spec; streaming UI; consent toggle; demo-mode message; verify in browser; build.

### Task 6: Try Before You Choose, Stories, Opportunities

**Files:** Create pages `try`, `stories`, `stories/[id]`, `stories/submit`, `opportunities` under `src/app/[locale]/` with components; `src/app/api/stories/route.ts` (zod-validated submission, consent required, status `pending`).
- [ ] Steps: experiment cards (time, difficulty, resources, outcome, reflection questions, "enjoyed the process or the idea?" + rating saved); stories search by theme/interest/challenge/age, badges, report button; submit form with anonymous option and consent; opportunities filters, verified date, outdated label; test `rejects submission without consent` in `tests/stories-api.test.ts`; build.

### Task 7: Dashboard, journal, "My changing mind", "What if I try?", mentors, settings

**Files:** Create pages `dashboard`, `journal`, `compare`, `what-if`, `mentors`, `settings`, `about`, `privacy`.
- [ ] Steps: dashboard (welcome, progress, saved, completed experiments, roadmap, next steps, timeline); journal CRUD; compare two reports side-by-side; what-if 3-month scenario via AI/demo; mentors interest form (local); settings: memory consent, delete all data (double confirm); build + browser check.

### Task 8: Auth + Admin

**Files:** Create `src/app/[locale]/auth/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/[locale]/admin/**`, `src/lib/auth/roles.ts`.
- [ ] Steps: email magic link + Google (only when env configured, else "нужна настройка"); guest mode default; admin guarded by `profiles.role in ('admin','moderator')`, sections: story moderation, reports, opportunities CRUD, sources, AI failures, anonymous analytics; without Supabase → setup instructions screen; test `requireRole denies user` in `tests/roles.test.ts`; build.

### Task 9: Story source discovery + final QA + README

**Files:** Create `scripts/discover-stories.ts` (Reddit API via env creds, RSS; respects robots; outputs `pending` documented stories for moderation), `README.md` (run, env vars, DB setup, AI setup, limitations, functional vs credential-gated).
- [ ] Steps: all tests pass; `npm run build`; browser walk: landing → explore → report → save story → experiment → dashboard → language switch → mobile 375px → dark theme; fix issues.
