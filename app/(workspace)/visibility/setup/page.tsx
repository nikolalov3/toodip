import type { Metadata } from "next";
import Link from "next/link";

import { AssistantTag, Eyebrow, SectionHead, Surface } from "@/components/panel/ui";
import { buttonVariants } from "@/components/ui/button";
import { LoadError } from "@/components/visibility/frame";
import { GscConnect } from "@/components/visibility/gsc-connect";
import { MeasurePanel, type BatteryPrompt } from "@/components/visibility/measure-panel";
import { formatDate } from "@/lib/format";
import { gscServiceEmail } from "@/lib/google/search-console";
import { addDays, weekStartOf } from "@/lib/periods";
import { getUserClient } from "@/lib/supabase/server";
import { ASSISTANT_LABEL, assistantsFor, isWeeklyTenant } from "@/lib/weekly-reports";
import {
  batteryGenerationConfigured,
  googleEngineConfigured,
  measurementConfigured,
  suggestPromptBattery,
} from "@/services/measurement";
import { nextMonthStart } from "@/services/reports";
import { loadVisibilityPage, type PageSearchParams } from "@/services/visibility-page";

export const metadata: Metadata = { title: "Setup · AI Visibility" };

export default async function SetupPage({ searchParams }: { searchParams: PageSearchParams }) {
  const { session, profile, overview, gsc, canMeasure, isAdmin, monthlyRuns } = await loadVisibilityPage(searchParams);
  if (overview.error) return <LoadError message={overview.error} />;

  const weekly = isWeeklyTenant(session.tenantId);
  const assistants = assistantsFor(session.tenantId);
  const nextRun = weekly ? addDays(weekStartOf(new Date()), 7) : nextMonthStart();

  // The measurement panel needs the saved battery, grouped by question type.
  let batteryPrompts: BatteryPrompt[] = [];
  let runsUsed = 0;
  if (canMeasure) {
    const supabase = await getUserClient();
    const [promptRows, used] = await Promise.all([
      supabase.from("visibility_prompts").select("id, text, language, active, intents(name, is_branded)").eq("tenant_id", session.tenantId).eq("active", true),
      supabase.rpc("visibility_runs_used", { p_tenant: session.tenantId }),
    ]);
    batteryPrompts = ((promptRows.data ?? []) as unknown as Array<{
      id: string;
      text: string;
      language: string | null;
      intents: { name: string; is_branded: boolean } | null;
    }>).map((row) => ({
      id: row.id,
      text: row.text,
      language: row.language ?? "en",
      intent: row.intents?.name ?? "unknown",
      isBranded: row.intents?.is_branded ?? false,
    }));
    runsUsed = typeof used.data === "number" ? used.data : 0;
  }
  const current = overview.current;
  const brandedCount = overview.prompts.filter((p) => p.isBranded).length;

  return (
    <>
      <SectionHead
        title="The report schedule"
        sub="Reports run on their own. The same questions are asked every time, so one report can be compared with the last."
        className="mt-0"
      />
      <div className="grid gap-3 lg:grid-cols-3">
        <Surface className="p-5">
          <Eyebrow>Cadence</Eyebrow>
          <p className="mt-2 text-[20px] font-semibold tracking-tight">{weekly ? "Every Monday" : "Every month"}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {monthlyRuns > 0
              ? `Next report: ${formatDate(`${nextRun}T00:00:00.000Z`)}. ${weekly ? "Read together with the website's traffic of the week before." : "It starts on the 1st and usually finishes within the day."}`
              : "Scheduled reports are part of the Visibility plan."}
          </p>
          <Link href="/reports" className="mt-3 inline-block text-[13px] font-medium text-brand hover:underline">
            Report history
          </Link>
        </Surface>
        <Surface className="p-5">
          <Eyebrow>Assistants asked</Eyebrow>
          <ul className="mt-2.5 flex flex-col gap-2 text-[14px]">
            {assistants.map((a) => (
              <li key={a}>
                <AssistantTag platform={a === "google" ? "google_aio" : "chatgpt"} name={ASSISTANT_LABEL[a]} />
                <p className="mt-0.5 pl-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {a === "google"
                    ? "Gemini answering with Google Search, the grounding Google's own AI answers are built on."
                    : "A GPT model answering with live web search, the way ChatGPT answers a customer."}
                </p>
              </li>
            ))}
          </ul>
        </Surface>
        <Surface className="p-5">
          <Eyebrow>Questions</Eyebrow>
          <p className="mt-2 text-[20px] font-semibold tracking-tight">
            <span className="text-numeric">{canMeasure ? batteryPrompts.length : overview.prompts.length}</span> in the battery
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Each asked twice per assistant, because an assistant asked the same thing twice does not always answer the same.
            {brandedCount > 0 ? ` ${brandedCount} of them name you directly and stay out of every score.` : ""}
          </p>
        </Surface>
      </div>

      {canMeasure ? (
        <>
          <SectionHead
            title="Questions and manual measurements"
            sub="Edit the battery, or ask it now without waiting for the next report. A manual measurement joins the current period's numbers."
          />
          <MeasurePanel
            prompts={batteryPrompts}
            suggestions={suggestPromptBattery({
              name: profile.name,
              category: profile.category,
              city: profile.city,
              district: profile.district,
              languages: profile.languages,
            })}
            hasKey={measurementConfigured()}
            canGenerate={batteryGenerationConfigured()}
            runsUsed={runsUsed}
            runsLimit={monthlyRuns}
            googleAvailable={googleEngineConfigured()}
          />
        </>
      ) : isAdmin ? (
        <Surface className="mt-6 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-[13.5px]">
            <span className="font-semibold">This plan reads results only.</span> Running measurements is part of the Visibility plan.
          </p>
          <Link href="/billing" className={buttonVariants({ size: "sm", variant: "outline" })}>
            See plans
          </Link>
        </Surface>
      ) : null}

      <SectionHead title="How it is measured" sub="The rules every number in the panel follows." />
      <Surface className="p-5">
        <dl className="grid gap-x-8 gap-y-3 text-[13.5px] leading-relaxed sm:grid-cols-[190px_1fr]">
          {current && (
            <>
              <dt className="text-muted-foreground">Latest measurement</dt>
              <dd>
                {current.label}, {current.method.label}: {overview.prompts.length} questions × {current.method.reps} repetitions = {current.runs} answers
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">A mention is</dt>
          <dd>Your name in the assistant&apos;s own words. A link to your site or a footnote is a source, counted separately, never a mention.</dd>
          <dt className="text-muted-foreground">A source backs a venue when</dt>
          <dd>Its footnote sits at the list item naming that venue. A site cited elsewhere in the same answer does not count for you.</dd>
          <dt className="text-muted-foreground">An answer counts when</dt>
          <dd>
            It was built on a search. Asked without help, Google&apos;s assistant sometimes answers from memory; such an answer is stored as evidence, kept out of
            every number, and the question is asked again until each one has its answers.
          </dd>
          <dt className="text-muted-foreground">Comparisons</dt>
          <dd>
            Only inside one series: the same assistant asked with the same model. ChatGPT and Google AI are shown side by side and never added up, and changing a model
            starts a new series.
          </dd>
          <dt className="text-muted-foreground">Real change or noise</dt>
          <dd>
            Every movement is tested against chance before it is called a rise or a fall. With about 70 answers per assistant, a change counts from roughly 15
            percentage points; anything smaller is reported as noise.
          </dd>
          <dt className="text-muted-foreground">Google AI</dt>
          <dd>
            Gemini with Google Search as its search tool. It is the closest reproducible measurement of what Google&apos;s AI answers; it is not a capture of an AI
            Overviews box on a results page.
          </dd>
          <dt className="text-muted-foreground">What a model does here</dt>
          <dd>
            Reads venue names out of an answer, and words the written summary. Every count, comparison and verdict is computed by the panel&apos;s own rules.
          </dd>
        </dl>
      </Surface>

      {/* Platform-side configuration: the owner never sees Search Console numbers, the analysis does. */}
      {session.isPlatformAdmin && (
        <>
          <SectionHead
            title="Data sources (platform only)"
            sub={
              gsc.connected
                ? `Search Console: ${gsc.siteUrl}${gsc.lastSyncedOn ? `, synced to ${gsc.lastSyncedOn}` : ", first sync pending"}${gsc.lastError ? ", last sync failed" : ""}`
                : "Search Console: not connected"
            }
          />
          <Surface className="border-dashed p-5">
            <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
              Search Console rows are never shown in the panel. They enter the written summary and the ordering of question types only next to a Google AI measurement,
              where Google&apos;s search demand and Google&apos;s answers describe one ecosystem.
              {gsc.error ? ` Reading them failed: ${gsc.error}.` : ""}
            </p>
            <GscConnect serviceEmail={gscServiceEmail()} currentSiteUrl={gsc.siteUrl} />
          </Surface>
        </>
      )}
    </>
  );
}
