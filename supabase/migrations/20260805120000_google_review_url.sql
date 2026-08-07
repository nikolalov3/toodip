-- ============================================================================
--  Where this venue's reviews live in public.
--
--  Until the Google Business Profile API connection is approved, replies are
--  carried over by hand. Storing the link turns that into one click instead of
--  a search, and the same column is what the connector will hang off later.
-- ============================================================================

alter table business_profiles
  add column if not exists google_review_url text;

comment on column business_profiles.google_review_url is
  'Public link to the venue''s Google reviews. Used for the manual publish hop, and later by the Business Profile connector.';
