# Review Reply Assistant

Reputation operations for local business. A review arrives, gets triaged, gets a
draft reply written in the venue's own voice, and waits for the right person to
approve it. Built multi tenant from the first table, as the first module of a
larger local visibility platform.

One data path and one authentication path: Supabase. There is no demo mode and
no sample data.

## Setting it up

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev
```

**1. Create the database.** Run both migrations, either through the Supabase
GitHub integration on push, or yourself:

```bash
supabase login
supabase link --project-ref <ref>
supabase db push
```

**2. Create your own account and make it a platform admin.** Follow
`supabase/bootstrap.sql`. It empties the database, then gives the account you
created in the dashboard a platform workspace and the `platform_admin` role.

**3. Sign in and add your first client** from the Clients screen. That creates
the workspace, the owner account and a starting business profile in one go, and
shows you the password once so you can hand it over. The client changes it
themselves from their account page.

## Who sees what

| Role | Sees |
| --- | --- |
| `platform_admin` | Every workspace, the Clients screen, prompt internals. Switches between clients from the sidebar |
| `tenant_admin` | Their own workspace. Approves, publishes, edits brand settings |
| `tenant_member` | Their own workspace. Drafts and edits, cannot approve or change settings |

Isolation is enforced by row level security, not by the application. Every query
runs on the signed in user's token.

## What is in the box

- **Dashboard** with the metrics an operator is judged on: response rate,
  average response time, pending approvals, sentiment and rating split.
- **Reviews** table with saved views, filters, search and a detail drawer that
  deep links.
- **Approval queue** driven by workspace policy, not by preference.
- **Brand settings**: tone, emoji policy, banned phrases, preferred wording,
  never mention list, keyword bank and brand voice examples.
- **Prompt studio**: the exact three layer prompt behind any review, versioned.
- **Activity log**: who generated, edited, approved, rejected and published.
- **Clients**: add a workspace, hand over credentials, switch between them.
- **Planned modules** (visibility, social, competitors, reports) render as real
  pages describing what they will do and what they reuse.

## How a reply gets made

1. **Classify** (`services/classification.ts`). Rule based, deterministic, runs
   in under a millisecond. It sets sentiment, risk flags and whether a human is
   required. Deliberately not a model call: the approval gate has to behave the
   same way every time, including when the model is down.
2. **Assemble the prompt** (`prompts/`). Three layers:
   - `system.ts` universal reply rules, versioned with `PROMPT_VERSION`
   - `tenant.ts` this venue: voice, banned phrases, keyword bank, policy
   - `runtime.ts` this review, its flags and the output request
3. **Generate** (`services/generation/`). The active provider receives the
   assembled prompt.
4. **Score** (`services/generation/quality.ts`). Every draft is checked for
   length, whether it echoes a real detail, keyword discipline, banned phrases,
   public talk about money, leaked staff names, emoji against the brand policy
   and, on negative reviews, a private contact route. The same checks apply to
   every engine.
5. **Decide**. Selecting a draft moves the review to the queue or auto approves
   it, depending on the rating and the risk flags. Nothing publishes without an
   approval record when the policy says so.

## Generation engines

`services/generation/index.ts` is a registry. `GENERATION_PROVIDER` picks one.

- `mock` a deterministic rule engine. No API call, no cost. The default.
- `openai` the real thing. Needs `OPENAI_API_KEY` and `OPENAI_MODEL`.

`GET /api/dev/compare-engines` runs the same reviews through several engines and
scores every draft with the same rules, so switching is a measured decision.

Generations against a paid engine are capped per user per hour by
`GENERATION_RATE_LIMIT_PER_HOUR`. It counts per warm instance, so treat it as a
brake on runaway loops, not as a quota. The real ceiling is the budget limit on
the provider account.

## Database

- `supabase/migrations/20260805090000_schema.sql` tables, enums, foreign keys,
  indexes
- `supabase/migrations/20260805090100_rls.sql` tenant isolation, admin only
  settings, append only audit log
- `supabase/bootstrap.sql` wipe and platform admin setup
- `supabase/config.toml` project link for the CLI

`GET /api/dev/supabase-check` reads once through every part of the repository
and names whatever failed, under the caller's own row level security.

The service role key is used in exactly one place: creating a client workspace
and the account behind it, which is the one operation that legitimately crosses
tenants. Everything that serves a screen runs on the user's token.

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
lib/            auth, supabase clients, formatting, labels, filters, repository
services/       classification, generation, reviews, metrics
prompts/        the three prompt layers and the builder
supabase/       migrations, RLS, bootstrap
types/          domain model and the repository contract
```

## Deploying

Vercel. Put the Supabase URL and anon key in the project environment. The
service role key is only needed if you create client workspaces from the
deployed app rather than locally.

Do not put a paid generation key on a deployment until you are happy with who
can reach it. `GENERATION_PROVIDER` unset means the offline engine and zero
spend.

## Conventions

- Interface copy is English and lives in `lib/labels.ts`. A second language is a
  second dictionary, not a rewrite.
- Prompt changes bump `PROMPT_VERSION`. Every draft stores the version that made
  it, so a regression traces back to a prompt.
- The services layer owns status transitions and the audit trail. Screens and
  routes never touch the repository directly.
