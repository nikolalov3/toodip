import "server-only";

import { fetchAll } from "@/lib/supabase/paginate";
import { getUserClient } from "@/lib/supabase/server";
import {
  SURVEY_OPTIONS,
  SURVEY_PREFIX,
  SURVEY_SITE_ID,
  parseSurveyName,
} from "@/lib/survey-module";
import { getStatsSite, type BarItem, type StatsSite } from "@/services/stats";

/** TEMPORARY (Belmont only) — see lib/survey-module.ts for how to remove. */

const DAYS = 90;
const MAX_OTHERS = 100;

export interface SurveyOther {
  ts: string;
  text: string;
  lang: string | null;
}

export interface SurveySnapshot {
  site: StatsSite | null;
  enabled: boolean;
  days: number;
  answers: number;
  options: BarItem[];
  fromAi: number;
  others: SurveyOther[];
  languages: BarItem[];
}

interface Row {
  ts: string;
  name: string | null;
  lang: string | null;
}

export async function getSurveySnapshot(): Promise<SurveySnapshot> {
  const site = await getStatsSite();
  const empty: SurveySnapshot = {
    site,
    enabled: site?.id === SURVEY_SITE_ID,
    days: DAYS,
    answers: 0,
    options: [],
    fromAi: 0,
    others: [],
    languages: [],
  };
  if (!site || !empty.enabled) return empty;

  const supabase = await getUserClient();
  const since = new Date(Date.now() - DAYS * 864e5).toISOString();
  const result = await fetchAll<Row>(() =>
    supabase
      .from("stats_events")
      .select("ts, name, lang", { count: "exact" })
      .eq("website_id", site.id)
      .eq("type", "event")
      .like("name", `${SURVEY_PREFIX}%`)
      .gte("ts", since)
      .order("ts", { ascending: false }),
  );

  const labelFor = new Map(SURVEY_OPTIONS.map((o) => [o.event, o.label]));
  const counts = new Map<string, number>();
  const langs = new Map<string, number>();
  const others: SurveyOther[] = [];
  let fromAi = 0;

  for (const row of result.rows) {
    const { event, text } = parseSurveyName(row.name ?? "");
    const label = labelFor.get(event) ?? event;
    counts.set(label, (counts.get(label) ?? 0) + 1);
    if (event === "ankieta-ai") fromAi += 1;

    const lang = (row.lang ?? "").slice(0, 2).toLowerCase();
    const langLabel = lang === "pl" ? "Polish" : lang === "en" ? "English" : lang ? lang.toUpperCase() : "Unknown";
    langs.set(langLabel, (langs.get(langLabel) ?? 0) + 1);

    if (event === "ankieta-inne" && text && others.length < MAX_OTHERS) {
      others.push({ ts: row.ts, text, lang: row.lang });
    }
  }

  const toBars = (m: Map<string, number>): BarItem[] =>
    [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  return {
    ...empty,
    answers: result.rows.length,
    options: toBars(counts),
    fromAi,
    others,
    languages: toBars(langs),
  };
}
