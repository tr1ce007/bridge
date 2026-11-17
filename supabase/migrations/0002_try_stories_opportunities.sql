-- Task 6: Try Before You Choose, Stories, Opportunities.
-- Additive: new columns have defaults, nothing is dropped except the old kind check.

-- experiment_completions: the exact 3-way answer ("the process" / "only the idea" / "not sure").
-- enjoyed_process stays (true only for "process").
alter table public.experiment_completions
  add column if not exists process_answer text check (process_answer in ('process', 'idea', 'unsure'));

-- opportunities: ten kinds, a country / region and the cost for the participant.
alter table public.opportunities drop constraint if exists opportunities_kind_check;
alter table public.opportunities add constraint opportunities_kind_check check (
  kind in ('scholarship', 'exchange', 'course', 'internship', 'volunteering',
           'conference', 'competition', 'fellowship', 'program', 'mentorship')
);
alter table public.opportunities
  add column if not exists country text not null default 'international'
    check (country in ('kazakhstan', 'central-asia', 'europe', 'germany', 'uk', 'usa',
                       'hungary', 'turkey', 'online', 'international')),
  add column if not exists cost text not null default 'unknown'
    check (cost in ('free', 'mixed', 'paid', 'unknown'));

-- stories: `intro`, `categories` and `ageRange` live inside the existing `content` jsonb, no column needed.
