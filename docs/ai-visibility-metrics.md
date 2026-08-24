# AI visibility metrics

The industry (Adobe's LLM Optimizer framing, Profound's product) has converged
on four headline metrics for "how visible is a brand inside AI answers". This
document maps each one to what toodip computes, where the code lives, and what
is still ahead. The measurement substrate for all of them is the same:
`visibility_runs` (one prompt, one platform, one execution) with separate
ledgers for `visibility_mentions` (brand names in the answer) and
`visibility_citations` (URLs the answer leaned on).

All metrics are computed over **category runs only** — branded prompts (people
asking about the venue by name) score near 100% by construction and are kept
out of every headline number. That rule comes from the Profound recon and is
non-negotiable.

## The four metrics

### 1. Brand mentions — built ✅

Share of category answers that name the venue. This is toodip's visibility
score: the hero number on the Visibility panel and the line the trend chart
plots.

- Computed in `getVisibilityOverview` (`services/visibility.ts`) as
  `metrics.brandMentionRate`; the same rate per day feeds `timeline`.
- Mentions are extracted per run at ingest/measurement time and stored in
  `visibility_mentions` with an `is_own` flag, so the metric is a pure count,
  never a re-interpretation of stored text.

### 2. Share of voice — built ✅

The venue's slice of *all* brand appearances across the same answers, plus its
rank. This is the metric that moves when a competitor gains even if the venue
holds steady, which makes it the honest competitive number.

- `metrics.shareOfVoice` = own appearances / all brand appearances
  (deduplicated per run, so one answer naming a brand twice counts once).
- `metrics.sovRank` / `metrics.sovBrands` place the venue on the leaderboard.
- The full per-brand table is `leaderboard` (section "Who is taking my spot?"),
  and the per-question ownership split is `intents[].owners` (section "Where
  exactly am I missing?").

### 3. Citation rate — built ✅ (heuristic own-presence detection)

Share of category answers that cite the venue's **own web presence** — its
website or its social profiles. Mentions without citations mean AI knows the
venue exists but has nothing of the venue's own to read; that gap is exactly
what the platform prescriptions fix.

- `metrics.citationRate`, with the matched domains in
  `metrics.ownCitedSources`.
- Own presence is detected by `ownPresenceTokens` + `citesOwnPresence`:
  the venue name is normalized (diacritics stripped), generic words (cafe,
  kawiarnia, bar, ...) dropped, and the remaining tokens plus the joined form
  are matched against citation domains *and URLs*, so `brukcafe.pl` and
  `instagram.com/brukcafe` both count.
- **Planned hardening:** an explicit `own_domains text[]` (plus `website`) on
  `business_profiles`, editable in Brand settings, that overrides the
  heuristic when set. Needs a migration (applied via `supabase db push` or the
  GitHub integration on merge to main), so the code ships heuristic-first and
  the column arrives as a follow-up.

### 4. AI referral traffic — not built, planned ⬛

Visits the venue's website receives *from* AI assistants (ChatGPT, Perplexity,
Gemini, Copilot). This cannot be computed from measurement runs at all — it
lives in the venue's site analytics. Plan, in order of effort:

1. **Referrer allowlist doc** — the known referrers
   (`chatgpt.com`, `chat.openai.com`, `perplexity.ai`, `gemini.google.com`,
   `copilot.microsoft.com`) and a GA4/Plausible segment recipe the venue can
   apply today. Zero code.
2. **Analytics import** — a nightly job pulling that segment from GA4
   (service-account per tenant) or Plausible (API key) into a new
   `referral_traffic_daily` table (`tenant_id, date, source, visits`), shown
   as a fourth trend on the Visibility panel next to score movement.
3. **Own snippet** (only if venues turn out not to have analytics at all): a
   one-line script serving a first-party counter keyed by referrer. Bigger
   lift, privacy review needed; do not start here.

The panel already shows the metric card with an explanatory "needs analytics
on the venue's site" state so the owner learns the concept before the pipe
exists.

## Methodology alignment

Adobe recommends testing 20–50 real purchase-intent prompts and comparing
across models. toodip's default battery is ~36 prompts across 8 intents, run
with repetitions (3× by default) because single executions of a stochastic
system are noise — distributions come from many runs. Cross-model comparison
is the platform split (`platforms`): ChatGPT / Google AI Overviews /
Perplexity, each with its own mention rate and citation diet, which is also
what makes the prescriptions per platform possible.

Two standing caveats, both enforced in the read model rather than left to
interpretation: verdict thresholds need a minimum sample (leaders and zeros
are the only stable signals at small n), and branded intents never mix into
category numbers.

## Roadmap summary

| Step | What | Status |
| --- | --- | --- |
| Brand mentions, SoV, citation rate in `MetricsSummary` + metric cards on the panel | this change | ✅ |
| `own_domains` on business profile + Brand settings field, overrides heuristic | migration + small UI | ⬛ |
| Referral traffic: GA4/Plausible segment recipe doc | doc only | ⬛ |
| Referral traffic: nightly import + `referral_traffic_daily` + panel trend | backend job | ⬛ |
| Per-model comparison view (same prompt, side-by-side answers) | UI over existing data | ⬛ |
