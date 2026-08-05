# Review Reply Assistant

Reputation operations for local business. A review arrives, gets triaged, gets a
draft reply written in the venue's own voice, and waits for the right person to
approve it. Built multi tenant from the first table, as the first module of a
larger local visibility platform.

The demo workspace is Cafe Kolektyw, a speciality coffee bar on Jozefa in
Kazimierz, Krakow. Reviews arrive in Polish and English, and replies come back in
the language of the review.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 and pick one of the three demo roles:

| Role | Can do |
| --- | --- |
| Marta Zielinska, workspace admin | Everything, including approve and publish |
| Jakub Nowak, member | Draft, edit, assign. No approvals, no settings |
| Nikola Krecisz, platform admin | Everything plus prompt internals |

No API keys are needed. Reply generation runs on a local rule engine, so the
whole workflow, the quality checks and the approval gate work offline.

## What is in the box

- **Dashboard** with the metrics an operator is judged on: response rate,
  average response time, pending approvals, sentiment and rating split.
- **Reviews** table with saved views, filters, search and a detail drawer that
  deep links.
- **Approval queue** driven by workspace policy, not by preference.
- **Brand settings**: tone, banned phrases, preferred wording, never mention
  list, keyword bank and brand voice examples.
- **Prompt studio**: the exact three layer prompt behind any review, versioned.
- **Activity log**: who generated, edited, approved, rejected and published.
- **Planned modules** (visibility, social, competitors, reports) render as real
  pages describing what they will do and what they reuse.

## How a reply gets made

1. **Classify** (`services/classification.ts`). Rule based, deterministic, runs
   in under a millisecond. It sets sentiment, risk flags and whether a human is
   required. It is deliberately not a model call: the approval gate has to
   behave the same way every time, including when the model is down.
2. **Assemble the prompt** (`prompts/`). Three layers:
   - `system.ts` universal reply rules, versioned with `PROMPT_VERSION`
   - `tenant.ts` this venue: voice, banned phrases, keyword bank, policy
   - `runtime.ts` this review, its flags and the output request
3. **Generate** (`services/generation/`). The active provider receives the
   assembled prompt. Today that is the offline rule engine.
4. **Score** (`services/generation/quality.ts`). Every draft is checked for
   length, whether it echoes a real detail, keyword discipline, banned phrases,
   public talk about money, leaked staff names and, on negative reviews, a
   private contact route. The same checks apply to every engine.
5. **Decide**. Selecting a draft moves the review to the queue or auto approves
   it, depending on the rating and the risk flags. Nothing publishes without an
   approval record when the policy says so.

## Data

Two adapters behind one interface (`types/repository.ts`).

**Demo (default).** A seeded workspace per browser session. Locally it persists
to `.demo-data/`, so approvals survive a restart. On Vercel the filesystem is
read only, so it lives in memory per instance and the sidebar says so out loud.
Reset it from the user menu.

**Supabase (next step).** The schema is already written and mirrors
`types/domain.ts` one to one:

- `supabase/migrations/20260805090000_schema.sql` tables, enums, foreign keys,
  indexes
- `supabase/migrations/20260805090100_rls.sql` tenant isolation, admin only
  settings, append only audit log
- `supabase/seed.sql` the same demo workspace as SQL
- `supabase/config.toml` project link for the CLI

Migrations use the CLI timestamp convention, so both paths work: the GitHub
integration runs them on push, or run them yourself.

```bash
supabase login
supabase link --project-ref <ref>
supabase db push
```

Then put the project URL and keys in `.env.local`, implement
`lib/repositories/supabase.ts` against the `DataRepository` interface, and
return it from `lib/repositories/index.ts`. Nothing else changes: screens,
routes and services only know the interface.

`seed.sql` is applied by `supabase db reset` locally. On a hosted project run it
once from the SQL editor.

## Switching on OpenAI

The provider is implemented (`services/generation/openai-provider.ts`) and
registered. It is inert until you give it a key.

```bash
GENERATION_PROVIDER=openai
OPENAI_API_KEY=...        # a key scoped to a dedicated OpenAI project
OPENAI_MODEL=...          # whatever your account lists as current
```

It receives the same assembled prompt as the rule engine, asks for JSON so
several drafts and their rationales come back cleanly, retries once on rate
limits and timeouts, and reports token usage. Everything around it, quality
scoring, storage, status transitions and the audit trail, is unchanged.

The prompt itself stays in this repo rather than in the OpenAI dashboard,
because the brand layer is built per tenant at request time. A dashboard prompt
cannot hold one venue's banned phrases and another's keyword bank.

## API

Every route validates with Zod and answers `{ data }` or `{ error, details }`.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/reviews` | List with the same filters the UI uses |
| POST | `/api/reviews` | Ingest one review and triage it |
| GET | `/api/reviews/:id` | Review, drafts, quality verdicts, prompt metadata |
| POST | `/api/reviews/generate-reply` | Assemble, generate, score, store |
| POST | `/api/reviews/classify` | With `reviewId` persists, with raw text is a dry run |
| POST | `/api/reviews/approve` | Admin only |
| POST | `/api/reviews/reject` | Admin only, notes required |
| GET, PATCH | `/api/business-profile` | Brand settings |
| GET, PATCH | `/api/keyword-bank` | Keyword bank, usage counts preserved |
| GET | `/api/activity` | Audit log |

## Structure

```
app/            routes, server actions, API handlers
components/     ui primitives, layout, review and settings surfaces
lib/            auth, formatting, labels, filters, demo store, repositories
services/       classification, generation, reviews, metrics
prompts/        the three prompt layers and the builder
supabase/       migrations, RLS, seed
types/          domain model and the repository contract
```

## Deploying

Vercel, zero configuration. The demo workspace runs in memory there, which is
enough to show the product and honest about what it is. Add Supabase before
anything a customer relies on.

## Conventions

- Interface copy is English and lives in `lib/labels.ts`. A second language is a
  second dictionary, not a rewrite.
- Prompt changes bump `PROMPT_VERSION`. Every draft stores the version that made
  it, so a regression traces back to a prompt.
- The services layer owns status transitions and the audit trail. Screens and
  routes never touch the repository directly.
