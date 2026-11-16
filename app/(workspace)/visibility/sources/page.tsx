import type { Metadata } from "next";

import { Chip, MiniBar, pct, SectionHead, StatGrid, StatTile, Surface } from "@/components/panel/ui";
import { Donut } from "@/components/stats/donut";
import { LoadError, MeasurementLine, NoMeasurements } from "@/components/visibility/frame";
import { cn } from "@/lib/utils";
import type { SourceCategory } from "@/services/visibility";
import { loadVisibilityPage, type PageSearchParams } from "@/services/visibility-page";

export const metadata: Metadata = { title: "Sources · AI Visibility" };

/** What to do about a source that backs rivals but never the venue. */
const GAP_ACTIONS: Record<SourceCategory, string> = {
  Google: "Complete the Google Business Profile: attributes, photos, Q&A, review replies.",
  Social: "Post about this on Instagram or Facebook; the assistants read public profiles.",
  "Guides & blogs": "Pitch a listing or a mention to this guide; it is already in the answers.",
  "Travel aggregators": "Claim and complete the listing on this site.",
  Reddit: "Join the thread openly as the owner, or ask regulars to recommend you there.",
  "Other & venue sites": "Check whether this site lists venues; a page about you here is read next time.",
};

const CATEGORY_SHORT: Record<SourceCategory, string> = {
  Google: "Google",
  Social: "Social",
  "Guides & blogs": "Guides",
  "Travel aggregators": "Travel",
  Reddit: "Reddit",
  "Other & venue sites": "Venue sites",
};

/** Chart palette tokens, see app/globals.css. */
const CATEGORY_COLOR: Record<SourceCategory, string> = {
  Google: "var(--chart-2)",
  Social: "var(--chart-4)",
  "Guides & blogs": "var(--chart-1)",
  "Travel aggregators": "var(--chart-3)",
  Reddit: "var(--chart-5)",
  "Other & venue sites": "var(--muted-foreground)",
};

export default async function SourcesPage({ searchParams }: { searchParams: PageSearchParams }) {
  const { overview, profile, canMeasure } = await loadVisibilityPage(searchParams);
  if (overview.error) return <LoadError message={overview.error} />;
  if (!overview.hasData || !overview.current) return <NoMeasurements canMeasure={canMeasure} />;

  const m = overview.metrics;
  const domains = overview.domains;
  const attributed = overview.attributable > 0;
  const byCategory = new Map<SourceCategory, number>();
  for (const d of domains) byCategory.set(d.category, (byCategory.get(d.category) ?? 0) + d.total);
  const ownSourceSet = new Set(attributed ? overview.ownSources.map((s) => s.domain) : m.ownCitedSources);
  const max = domains[0]?.total ?? 1;
  const changes = overview.changes?.comparable ? overview.changes : null;
  const gapAction = (g: (typeof overview.gapSources)[number]) =>
    g.ownerRival
      ? `This is ${g.ownerRival}'s own website, read when they are recommended. Your site needs the same facts: menu with prices, hours, district, FAQ.`
      : GAP_ACTIONS[g.category];

  return (
    <>
      <MeasurementLine overview={overview} profile={profile} />

      <StatGrid cols={3}>
        <StatTile
          label="Own site cited"
          value={<span className={m.citationRate > 0 ? "text-positive" : "text-critical"}>{pct(m.citationRate)}</span>}
          hint="Share of answers citing your website or your social profiles as a source."
          sub={m.citationRate > 0 ? m.ownCitedSources.slice(0, 3).join(", ") : "No answer cites your website or profiles"}
        />
        <StatTile
          label="Sources behind your mentions"
          value={attributed ? overview.ownSources.length : "—"}
          hint="Distinct sources cited at the very list items that name you: what the assistant used for you, not a site that merely appears in the same answer."
          sub={
            attributed
              ? overview.ownSources.length > 0
                ? overview.ownSources.slice(0, 3).map((s) => `${s.domain} (${s.count})`).join(", ")
                : "Named from memory, with nothing to quote"
              : "Answer texts are not stored for this measurement"
          }
        />
        <StatTile
          label="Sources backing only rivals"
          value={<span className={overview.gapSources.length > 0 ? "text-caution" : undefined}>{overview.gapSources.length}</span>}
          hint="Cited at a rival's item in at least two answers and never at yours."
          sub={overview.gapSources.length > 0 ? overview.gapSources.slice(0, 2).map((g) => g.domain).join(", ") : "Every repeated source also backs you"}
        />
      </StatGrid>

      {changes && (changes.newSources.length > 0 || changes.goneSources.length > 0) && (
        <Surface className="mt-3 px-5 py-4 text-[13.5px] leading-relaxed">
          {changes.newSources.length > 0 && (
            <p>
              <span className="font-semibold">New since {changes.previous!.label}:</span>{" "}
              <span className="text-muted-foreground">{changes.newSources.map((s) => `${s.domain} (${s.count})`).join(", ")}.</span>
            </p>
          )}
          {changes.goneSources.length > 0 && (
            <p className={cn(changes.newSources.length > 0 && "mt-1")}>
              <span className="font-semibold">No longer cited:</span>{" "}
              <span className="text-muted-foreground">{changes.goneSources.map((s) => `${s.domain} (${s.count})`).join(", ")}.</span>
            </p>
          )}
        </Surface>
      )}

      <SectionHead
        title="What is the assistant reading?"
        sub="The sources behind the answers, and which of them back your mentions."
        hint={
          attributed
            ? "Category questions only. Cited = answers citing the domain anywhere. Backs you = answers where the domain is the footnote at the very item that names you."
            : "Category questions only. Cited = answers citing the domain anywhere. Alongside you = answers citing the domain that also name you: co-occurrence, because the answer texts of this measurement are not stored."
        }
      />
      <Surface className="p-5">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="shrink-0">
            <Donut
              slices={[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label: CATEGORY_SHORT[label], value }))}
              center={String(overview.totalCitations)}
              centerLabel="citations"
              maxSlices={6}
              size={156}
              className="lg:flex-col lg:items-start"
            />
          </div>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="py-2.5">Domain</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5 pr-2"> </th>
                  <th className="py-2.5 text-right">Cited</th>
                  <th className="py-2.5 pl-3 text-right">{attributed ? "Backs you" : "Alongside you"}</th>
                </tr>
              </thead>
              <tbody>
                {domains.slice(0, 14).map((d) => {
                  const isOwn = ownSourceSet.has(d.domain);
                  const backs = attributed ? (d.backsYou ?? 0) : d.runsWithOwnMention;
                  return (
                    <tr key={d.domain} className={cn("border-b border-border/60 last:border-b-0", isOwn && "text-brand")}>
                      <td className="max-w-[200px] truncate py-2.5 font-medium" title={d.domain}>
                        {d.domain}
                        {isOwn && <span className="ml-1.5 text-[10.5px] font-semibold uppercase tracking-wide">backs you</span>}
                      </td>
                      <td className="py-2.5">
                        <Chip className="rounded-md" title={d.category}>
                          <i aria-hidden className="inline-block size-1.5 rounded-full" style={{ background: CATEGORY_COLOR[d.category] }} />
                          <span className="text-muted-foreground">{CATEGORY_SHORT[d.category]}</span>
                        </Chip>
                      </td>
                      <td className="w-[26%] py-2.5 pr-2">
                        <MiniBar value={d.total} max={max} color={CATEGORY_COLOR[d.category]} />
                      </td>
                      <td className="text-numeric py-2.5 text-right font-semibold">{d.total}</td>
                      <td className={cn("text-numeric py-2.5 pl-3 text-right", backs > 0 ? "font-medium text-positive" : "text-muted-foreground")}>
                        {backs > 0 ? `${backs}×` : "never"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Surface>

      <SectionHead
        id="gaps"
        title="Sources behind your rivals that never back you"
        sub={
          attributed
            ? "Cited at a rival's item in at least two answers and never at yours. A guide here is a page the assistant already trusts; a rival's own site shows what gets quoted."
            : "Cited in at least two answers that recommend someone else and in no answer that names you."
        }
      />
      <Surface className="overflow-hidden">
        {overview.gapSources.length === 0 ? (
          <p className="px-5 py-5 text-[13.5px] text-muted-foreground">Every source cited more than once also backs an answer that names you. Nothing to chase here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-[13.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="px-5 py-3">Source</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3 text-right">Answers</th>
                  <th className="px-3 py-3">Backs</th>
                  <th className="px-5 py-3">What to do</th>
                </tr>
              </thead>
              <tbody>
                {overview.gapSources.map((g) => (
                  <tr key={g.domain} className="border-b border-border/60 align-top last:border-b-0">
                    <td className="px-5 py-3 font-medium">{g.domain}</td>
                    <td className="px-3 py-3 text-muted-foreground">{g.ownerRival ? "Rival's site" : CATEGORY_SHORT[g.category]}</td>
                    <td className="text-numeric px-3 py-3 text-right font-semibold">{g.count}</td>
                    <td className="px-3 py-3 text-muted-foreground">{g.rivals.join(", ")}</td>
                    <td className="px-5 py-3 leading-relaxed text-muted-foreground">{gapAction(g)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </>
  );
}
