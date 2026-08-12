-- Chat-mode ingestion has no star input. The classifier infers a rating from
-- the text (negative -> 2, neutral -> 3, positive -> 5) and this flag records
-- that the number is a guess, not something the reviewer typed.
-- Idempotent so the SQL editor and `supabase db push` can both run it.
alter table reviews
  add column if not exists rating_inferred boolean not null default false;
