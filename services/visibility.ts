import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import { requireSession } from "@/lib/auth/session";
import { fetchAll } from "@/lib/supabase/paginate";
import { getUserClient } from "@/lib/supabase/server";

/**
 * Read model for the visibility module.
 *
 * The dataset per tenant is small (hundreds of runs), so aggregation happens
 * here rather than in SQL. The rules encoded below come from the Profound
 * recon: branded intents never mix with category intents, verdicts need a
 * minimum sample, and leaders plus zeros are the only stable signals.
 *
 * One rule added later, after measurements made with different models landed
 * in the same ledger: numbers are only ever compared within one METHOD (the
 * source of the run plus the model that answered). A monthly report on one
 * model and an imported measurement on another are two series, never one
 * line, and a delta is only printed against the previous point of the same
 * method.
 */

export type Platform = "chatgpt" | "google_aio" | "perplexity" | "other";

export type SourceCategory =
  | "Google"
  | "Social"
  | "Guides & blogs"
  | "Travel aggregators"
  | "Reddit"
  | "Other & venue sites";

export type IntentStatus = "none" | "flicker" | "present";

export type QuestionStatus = "reliable" | "flicker" | "absent" | "single";

export interface QuestionRow {
  text: string;
  language: string;
  runs: number;
  own: number;
  status: QuestionStatus;
}

export interface IntentSummary {
  name: string;
  language: string;
  isBranded: boolean;
  runs: number;
  ownMentions: number;
  /** none = gate 1, flicker = unstable, present = stable signal */
  status: IntentStatus;
  owners: Array<{ name: string; isOwn: boolean; count: number; share: number }>;
  /** The questions behind this type, with the venue's result on each. */
  questions: QuestionRow[];
  /** The rival named most often for this type and what the assistants read when naming them. */
  leader: { name: string; share: number; sources: Array<{ domain: string; count: number }> } | null;
  /** Google demand for the type, when Search Console is connected. */
  demand: { impressions: number; clicks: number; queries: number; top: string[] } | null;
  /** Answers at stake weighted by how winnable the type is and by Google demand; sorts the table. */
  priority: number;
}

/** Google Search Console demand per question type, last 28 days, from services/gsc.ts. */
export interface DemandByIntent {
  [intent: string]: { impressions: number; clicks: number; queries: number; top: string[] };
}

export type ActionKind = "flicker" | "lost" | "guide" | "intent" | "rival_site" | "citation";

/** One thing to do this month, derived from the measurement, with the evidence next to it. */
export interface ActionItem {
  kind: ActionKind;
  title: string;
  why: string;
  /** Answers this would touch, for ordering and for the owner's sense of scale. */
  affects: number;
  /** Where on the page the evidence lives. */
  href: string;
}

export interface Quote {
  prompt: string;
  text: string;
}

export interface Descriptor {
  word: string;
  count: number;
}

export interface PlatformSummary {
  platform: Platform;
  runs: number;
  ownMentions: number;
  topDomains: Array<{ domain: string; count: number }>;
}

export interface LeaderboardRow {
  name: string;
  isOwn: boolean;
  runsMentioned: number;
  /** runsMentioned / category runs: how often the venue is named. */
  share: number;
  /** runsMentioned / all brand appearances: the venue's share of voice. */
  sovShare: number;
}

export interface DomainRow {
  domain: string;
  category: SourceCategory;
  total: number;
  byPlatform: Record<"chatgpt" | "google_aio" | "perplexity", number>;
  /** How many of the runs citing this domain also mentioned the venue (same answer, any item). */
  runsWithOwnMention: number;
  /**
   * Answers where this domain is cited at the very list item that names the
   * venue: the source the assistant used FOR the venue. Null when the answer
   * texts are not stored, in which case only co-occurrence is known.
   */
  backsYou: number | null;
}

/** A domain the assistants read when they recommend rivals, never when they name the venue. */
export interface GapSource {
  domain: string;
  category: SourceCategory;
  /** Answers naming a rival (and not the venue) that cite this domain. */
  count: number;
  /** The rivals those answers named most often. */
  rivals: string[];
  /** Set when the domain is one of those rivals' own website: not a page to get onto, a page to match. */
  ownerRival: string | null;
}

export interface PromptSummary {
  text: string;
  intent: string;
  isBranded: boolean;
  language: string;
  runs: number;
  ownMentions: number;
  platforms: Platform[];
}

export interface RunPreview {
  id: string;
  platform: Platform;
  executedOn: string;
  prompt: string;
  intent: string;
  mentionedOwn: boolean;
  mentions: string[];
  citations: string[];
  responseText: string | null;
}

export interface InterventionRow {
  id: string;
  kind: string;
  surface: string;
  description: string;
  performedOn: string;
  /** The last comparable measurement finished before the change. */
  before: { label: string; score: number } | null;
  /** The first comparable measurement started after the change. */
  after: { label: string; score: number } | null;
}

/**
 * The four industry-standard AI visibility metrics (Adobe's framing), all
 * computed over category runs so branded questions never inflate them:
 *
 * - brandMentionRate  share of answers naming the venue (this is the score)
 * - shareOfVoice      the venue's slice of ALL brand appearances, so it moves
 *                     when competitors gain even if the venue holds steady
 * - citationRate      share of answers citing the venue's own web presence
 *                     (its site or its social profiles)
 * - referral traffic  is NOT here: it lives in the venue's site analytics,
 *                     not in measurement runs. See docs/ai-visibility-metrics.md.
 */
export interface MetricsSummary {
  /** 0..1 across category runs. Same number the trend line plots. */
  brandMentionRate: number;
  /** Own appearances / all brand appearances, 0..1. */
  shareOfVoice: number;
  /** 1-based position on the leaderboard, null when never mentioned. */
  sovRank: number | null;
  /** How many venues compete on the leaderboard. */
  sovBrands: number;
  /** Share of category runs citing the venue's own site or profiles, 0..1. */
  citationRate: number;
  /** The domains (or social profiles) the heuristic attributed to the venue, for the UI. */
  ownCitedSources: string[];
}

/** How a period was measured: the run source plus the answering model. */
export interface MethodMeta {
  key: string;
  label: string;
  /** Repetitions per question in that period (median), 1 when asked once. */
  reps: number;
}

/** One measurement period: category runs only, branded intents excluded. */
export interface TrendPoint {
  /** First day of the period (ISO date). */
  date: string;
  /** Last day a run of the period was executed (ISO date), for ordering. */
  endDate: string;
  /** Period key, see periodOf(). */
  period: string;
  /** Human label: "Oct 2026" for a monthly report, a date for a one-off. */
  label: string;
  runs: number;
  ownMentions: number;
  /** Share of category runs in the period that mentioned the venue, 0..1. */
  score: number;
  /** Interventions logged inside the period, for markers on the chart. */
  interventions: number;
  method: MethodMeta;
}

export interface IntentChange {
  name: string;
  before: IntentStatus;
  after: IntentStatus;
  beforeRate: number;
  afterRate: number;
}

export interface BrandChange {
  name: string;
  isOwn: boolean;
  /** Share of answers naming the brand, before and after. */
  before: number;
  after: number;
  delta: number;
}

export interface QuestionChange {
  text: string;
  intent: string;
  before: number;
  after: number;
  runs: number;
}

/**
 * What moved between the latest measurement and the previous one made the
 * same way. Everything here compares like with like; when the previous
 * measurement used another method, `comparable` is false and the card says
 * so instead of inventing a delta.
 */
export interface ChangeSummary {
  comparable: boolean;
  previous: { period: string; label: string; categoryRuns: number } | null;
  /** The chronologically previous period, when it was measured differently. */
  otherMethodPrevious: { label: string; method: string } | null;
  scoreBefore: number | null;
  /** Percentage points. */
  scoreDelta: number | null;
  sovBefore: number | null;
  sovDelta: number | null;
  intents: IntentChange[];
  brands: BrandChange[];
  newSources: Array<{ domain: string; count: number }>;
  goneSources: Array<{ domain: string; count: number }>;
  questionsWon: QuestionChange[];
  questionsLost: QuestionChange[];
  /** What backed the venue's mentions (footnotes at its own items), then and now. */
  backingBefore: Array<{ domain: string; count: number }>;
  backingAfter: Array<{ domain: string; count: number }>;
}

export interface VisibilityOverview {
  hasData: boolean;
  /** Set when the ledger could not be read; the page shows it instead of an empty state. */
  error?: string;
  /** The measurement the headline numbers describe: the latest period. */
  current: {
    period: string;
    label: string;
    start: string;
    end: string;
    runs: number;
    categoryRuns: number;
    method: MethodMeta;
    /** The assistant most of the period's runs measured. */
    platform: Platform;
  } | null;
  /** Whether Search Console demand shaped this overview (only for Google AI measurements). */
  demandApplied: boolean;
  metrics: MetricsSummary;
  sources: string[];
  dates: string[];
  timeline: TrendPoint[];
  changes: ChangeSummary | null;
  /** This month's plan, most answers at stake first. */
  actions: ActionItem[];
  /** Sentences from the latest answers that name the venue, as evidence. */
  quotes: Quote[];
  /** Words the assistants use next to the venue's name, most frequent first. */
  descriptors: Descriptor[];
  /** The same for the strongest rival, for contrast. */
  rivalDescriptors: { name: string; words: Descriptor[] } | null;
  totalRuns: number;
  totalCitations: number;
  categoryRuns: number;
  categoryOwnMentions: number;
  intents: IntentSummary[];
  platforms: PlatformSummary[];
  /** Every brand named in the latest measurement, ranked; the venue always included. */
  leaderboard: LeaderboardRow[];
  totalAppearances: number;
  domains: DomainRow[];
  /** Domains cited at the venue's own list items, by answers. Empty when texts are missing. */
  ownSources: Array<{ domain: string; count: number }>;
  /** Answers in the latest measurement whose text is stored, so sources can be attributed per item. */
  attributable: number;
  gapSources: GapSource[];
  prompts: PromptSummary[];
  recentRuns: RunPreview[];
  recentRunsTotal: number;
  interventions: InterventionRow[];
}

interface RunRow {
  id: string;
  platform: Platform;
  executed_on: string;
  source: string;
  model_version: string | null;
  visibility_prompts: {
    text: string;
    language: string;
    intents: { name: string; language: string; is_branded: boolean } | null;
  } | null;
  visibility_mentions: Array<{ name: string; is_own: boolean }>;
  visibility_citations: Array<{ url: string; domain: string }>;
}

const SOCIAL = /instagram|facebook|youtube|tiktok|pinterest/;
const TRAVEL = /tripadvisor|wanderlog|yelp|booking|airbnb/;
// Guides, city portals and venue directories: pages that list many venues.
const GUIDES =
  /kukbuk|krakowfood|gojammin|polskapogodzinach|vogue|twojstyl|smartblonde|naszemiasto|krakow\.com|krakow\.pl|krakowcitybreaks|krakow-trip|bestofwarsaw|najlepszewwarszawie|warsawcity|kawa\.pl|foodie|magazyn|przewodnik|inyourpocket|kulinarny|gdziejemy|krakowchanka|restaurantguru|eatbu|menuradar|coffeepals|cartogiraffe|foursquare|atlas|coffeemap|roasterroute|bestin|coffeedash|brewwworld|corner\.inc|\.guide$|timeout|culinaryon|pyszne|zomato|gastronauci|wanderlog/;

/**
 * The unit the panel compares. toodip's own runs belong to a monthly report
 * however many ticks it took to complete, so they group by month; imported
 * baselines and manual measurements keep their day.
 */
export function periodOf(run: { source: string; executed_on: string }): string {
  return run.source === "toodip" ? run.executed_on.slice(0, 7) : run.executed_on;
}

export function periodStart(period: string): string {
  return period.length === 7 ? `${period}-01` : period;
}

export function periodLabel(period: string): string {
  const d = new Date(`${periodStart(period)}T00:00:00Z`);
  return period.length === 7
    ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Whether a dated event (an intervention) falls inside a period. */
export function periodContains(period: string, isoDate: string): boolean {
  return period.length === 7 ? isoDate.slice(0, 7) === period : isoDate === period;
}

/** Two runs are comparable when the same kind of source asked the same model. */
export function methodKey(run: { source: string; model_version: string | null }): string {
  return `${run.source}|${(run.model_version ?? "").replace(/:online$/, "")}`;
}

/** A model id as the owner should read it. */
export function modelLabel(model: string | null | undefined): string {
  if (!model) return "unknown model";
  const m = model.replace(/:online$/, "");
  if (/baseline/i.test(m)) return "baseline (web search)";
  if (/gpt-chat-latest/.test(m)) return "ChatGPT default model";
  if (/gpt-4o-mini/.test(m)) return "GPT-4o mini";
  if (/gpt-4\.1-mini/.test(m)) return "GPT-4.1 mini";
  if (/gpt-6-luna/.test(m)) return "GPT-6 Luna";
  if (/gpt-6-sol/.test(m)) return "GPT-6 Sol";
  if (/sonar/.test(m)) return "Perplexity Sonar";
  if (/gemini/.test(m)) return "Gemini";
  return m.replace(/^[a-z0-9-]+\//, "");
}

export function methodLabelOf(run: { source: string; model_version: string | null }): string {
  const model = modelLabel(run.model_version);
  if (run.source === "profound") return `${model} · Profound export`;
  if (run.source === "manual") return `${model} · web search, imported`;
  return `${model} · web search`;
}

export function classifyDomain(domain: string): SourceCategory {
  if (/(^|\.)google\./.test(domain) || domain === "google.com") return "Google";
  if (SOCIAL.test(domain)) return "Social";
  if (/reddit/.test(domain)) return "Reddit";
  if (TRAVEL.test(domain)) return "Travel aggregators";
  if (GUIDES.test(domain)) return "Guides & blogs";
  return "Other & venue sites";
}

/** Words that appear in half the venue names in a category and identify nothing. */
const GENERIC_NAME_WORDS = new Set([
  "cafe", "caffe", "kawiarnia", "coffee", "kawa", "restaurant", "restauracja",
  "bar", "bistro", "pizzeria", "hotel", "salon", "studio", "club", "klub",
  "the", "and", "und", "house", "dom", "i",
  // Trade words that extractors attach or drop at random: "Karma" and
  // "Karma Coffee Roasters" are one entry on the leaderboard.
  "roasters", "roastery", "roasting", "specialty", "speciality", "espresso",
  "matcha", "cukiernia", "bakery", "piekarnia", "pub",
]);

function foldLetters(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l");
}

/**
 * The key two spellings of one venue share: letters folded ("Café" = "Cafe"),
 * punctuation dropped, generic words removed. "Cafe Camelot", "Camelot Café"
 * and "CAMELOT" all become "camelot"; "Camelot Lulu Bistro" stays apart as
 * "camelot lulu". A per-tenant alias table can refine this later without
 * changing what the metrics mean.
 */
export function brandKey(name: string): string {
  const words = foldLetters(name).split(/[^a-z0-9]+/).filter(Boolean);
  const core = words.filter((word) => !GENERIC_NAME_WORDS.has(word));
  return (core.length > 0 ? core : words).join(" ");
}

/**
 * Tokens that identify the venue inside a domain or a social profile path,
 * derived from its name. "Bruk Cafe" yields ["bruk", "brukcafe"], which
 * matches brukcafe.pl and instagram.com/brukcafe. A heuristic on purpose: it
 * needs no configuration, and an explicit own-domains list on the business
 * profile can override it later without changing the metric's meaning.
 */
export function ownPresenceTokens(name: string): string[] {
  const words = foldLetters(name).split(/[^a-z0-9]+/).filter(Boolean);
  const tokens = new Set(
    words.filter((word) => word.length >= 4 && !GENERIC_NAME_WORDS.has(word)),
  );
  if (words.length > 1) tokens.add(words.join(""));
  return [...tokens];
}

function socialPath(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Does a citation point at the venue's own presence? For ordinary hosts the
 * venue's token has to be in the DOMAIN (belmont.cafe), never just somewhere
 * in the path: a guide's review at krakowfood.com/cafe-belmont is the guide's
 * page, not the venue's. On social hosts the profile path decides.
 */
export function citesOwnPresence(
  citation: { url: string; domain: string },
  tokens: string[],
): boolean {
  const domain = citation.domain.toLowerCase().replace(/^www\./, "");
  if (SOCIAL.test(domain)) {
    const path = socialPath(citation.url);
    return tokens.some((token) => path.includes(token));
  }
  return tokens.some((token) => domain.includes(token));
}

/** How an own citation is listed: the domain, or the social profile. */
export function ownCitationLabel(citation: { url: string; domain: string }): string {
  const domain = citation.domain.toLowerCase().replace(/^www\./, "");
  if (!SOCIAL.test(domain)) return domain;
  const handle = socialPath(citation.url).split("/").filter(Boolean)[0];
  return handle ? `${domain}/${handle}` : domain;
}

function topCounts(
  values: string[],
  limit: number,
): Array<{ domain: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([domain, count]) => ({ domain, count }));
}

function intentStatus(own: number, runs: number): IntentStatus {
  if (own === 0) return "none";
  return own / Math.max(runs, 1) >= 0.25 ? "present" : "flicker";
}

function questionStatus(own: number, runs: number): QuestionStatus {
  if (runs < 2) return "single";
  if (own === 0) return "absent";
  return own === runs ? "reliable" : "flicker";
}

/** Markdown and sources out, so a quote reads like the assistant said it. */
function plainText(text: string): string {
  return text
    .replace(/\(\s*\[[^\]]*\]\((?:https?:)?\/\/[^)\s]*\)\s*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)\s]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*_#>`]+/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** One line of an answer at a time (a list item is a line), then sentences. */
function sentencesOf(text: string): string[] {
  return plainText(text)
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/))
    .map((s) => s.replace(/^\s*(?:\d+[.)]|[-•–])\s*/, "").trim())
    .filter((s) => s.length >= 25);
}

/**
 * Words too common to describe anything, in the two languages the batteries
 * use. Kept short on purpose: the point is "matcha", "Kazimierz", "ciasta",
 * not a linguistics exercise.
 */
const DESCRIPTOR_STOPWORDS = new Set([
  "about", "after", "again", "almost", "along", "also", "always", "among", "another", "around", "because", "before",
  "being", "between", "could", "every", "first", "found", "great", "here", "known", "local", "located", "many", "more",
  "most", "much", "near", "offer", "offers", "often", "other", "place", "places", "popular", "really", "right", "same",
  "several", "should", "since", "small", "some", "spot", "spots", "still", "their", "there", "these", "they", "thing",
  "things", "think", "this", "those", "through", "very", "visit", "want", "well", "where", "which", "while", "with",
  "within", "would", "your", "youre", "cafe", "cafes", "coffee", "shop", "shops", "venue", "venues", "krakow", "cracow",
  "street", "options", "option", "worth", "check", "checking", "recommend", "recommended", "choice", "answer",
  "jedna", "jeden", "jedno", "jest", "jako", "jesli", "jeszcze", "kilka", "ktora", "ktore", "ktory", "ktorych",
  "ktorym", "kazdy", "mozna", "mozesz", "moze", "miejsce", "miejsca", "miejscu", "miejsc", "miejscowka", "miejscowki",
  "nawet", "niego", "oferuje", "oferuja", "oraz", "polecam", "polecane", "polecana", "popularna", "popularne",
  "popularny", "przede", "przy", "raczej", "swoje", "swoja", "takze", "rowniez", "tutaj", "tylko", "warto",
  "wszystko", "wiele", "wiecej", "znajduje", "znajdziesz", "znana", "znane", "znany", "sprawdz", "sprawdzic",
  "kawiarnia", "kawiarni", "kawiarnie", "kawiarnio", "kawiarniach", "lokal", "lokale", "lokalu", "krakowie",
  "krakowa", "krakowski", "krakowska", "krakowskie", "ulica", "ulicy", "blisko", "pobliz", "poblizu", "bardzo",
  "dobra", "dobre", "dobrej", "dobry", "dobrych", "swietna", "swietne", "swietny", "ciekawa", "ciekawe", "ciekawy",
  "idealna", "idealne", "idealny", "maja", "tego", "temu", "tych", "tutaj", "gdzie", "czyli", "zaraz", "obok",
  "okolicy", "okolice", "centrum", "adres", "godziny", "otwarte", "codziennie",
  // Superlatives say nothing about what the venue is.
  "najlepsza", "najlepsze", "najlepszy", "najlepszych", "najlepszej", "najbardziej", "better", "favourite", "favorite",
  "excellent", "amazing", "perfect", "lovely", "nice", "good",
]);

/** The words next to a venue's name across the sentences that name it. */
function descriptorsOf(sentences: string[], exclude: Set<string>, limit = 8): Descriptor[] {
  const counts = new Map<string, number>();
  for (const sentence of sentences) {
    const seen = new Set<string>();
    for (const word of foldLetters(sentence).split(/[^a-z0-9]+/)) {
      if (word.length < 5 || /^\d+$/.test(word) || DESCRIPTOR_STOPWORDS.has(word) || exclude.has(word) || seen.has(word)) continue;
      seen.add(word);
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

function namesSentence(sentence: string, keys: string[]): boolean {
  const folded = foldLetters(sentence);
  return keys.some((key) => key.length >= 3 && folded.includes(key));
}

/** The folded forms a venue's name may take inside an answer. */
function nameKeys(name: string): string[] {
  return [brandKey(name), ...ownPresenceTokens(name)].filter((key) => key.length >= 3);
}

const INLINE_LINK = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * An answer as the assistant structured it: one entry per list item or
 * paragraph, sub-bullets glued to their parent. The source footnote the
 * assistant puts at the end of an item is the source for THAT item, which is
 * how a citation gets attributed to the venue it backs instead of to every
 * venue in the answer.
 */
function itemsOf(text: string): string[] {
  const out: string[] = [];
  let current: string[] = [];
  for (const line of text.split("\n")) {
    const startsItem = /^\s*(?:\d+[.)]\s|[-•*]\s+\*\*|#{1,4}\s)/.test(line);
    if (startsItem && current.length) {
      out.push(current.join("\n"));
      current = [line];
    } else if (!line.trim() && current.length) {
      out.push(current.join("\n"));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) out.push(current.join("\n"));
  return out;
}

/** Domains cited at the items of an answer that name the given venue. */
function domainsAt(text: string, keys: string[]): Set<string> {
  const out = new Set<string>();
  for (const item of itemsOf(text)) {
    if (!namesSentence(item, keys)) continue;
    for (const match of item.matchAll(INLINE_LINK)) {
      const host = hostOf(match[2]);
      if (host) out.add(host);
    }
  }
  return out;
}

const OWN_KEY = "__own__";

interface BrandAgg {
  display: string;
  count: number;
  isOwn: boolean;
  spellings: Map<string, number>;
}

/** One entry per brand per run; every spelling flagged as the venue folds into one. */
function brandsInRun(run: RunRow): Map<string, { name: string; isOwn: boolean }> {
  const map = new Map<string, { name: string; isOwn: boolean }>();
  for (const mention of run.visibility_mentions) {
    const key = mention.is_own ? OWN_KEY : brandKey(mention.name);
    if (!key || map.has(key)) continue;
    map.set(key, { name: mention.name, isOwn: mention.is_own });
  }
  return map;
}

function countBrand(into: Map<string, BrandAgg>, key: string, name: string, isOwn: boolean, ownDisplay?: string) {
  const entry = into.get(key) ?? { display: isOwn ? (ownDisplay ?? name) : name, count: 0, isOwn, spellings: new Map() };
  entry.count += 1;
  entry.isOwn = entry.isOwn || isOwn;
  entry.spellings.set(name, (entry.spellings.get(name) ?? 0) + 1);
  if (!entry.isOwn) {
    // The most frequent spelling is the one the owner recognises.
    let best = entry.display;
    let bestN = -1;
    for (const [spelling, n] of entry.spellings) {
      if (n > bestN) {
        best = spelling;
        bestN = n;
      }
    }
    entry.display = best;
  }
  into.set(key, entry);
}

function ownMentioned(run: RunRow): boolean {
  return run.visibility_mentions.some((m) => m.is_own);
}

function isCategory(run: RunRow): boolean {
  return !run.visibility_prompts?.intents?.is_branded;
}

/** Repetitions per question: runs over distinct questions, rounded. */
function repsOf(runs: RunRow[]): number {
  const prompts = new Set(runs.map((run) => run.visibility_prompts?.text ?? run.id));
  return Math.max(1, Math.round(runs.length / Math.max(prompts.size, 1)));
}

function methodOf(runs: RunRow[]): MethodMeta {
  // A period is one source and (almost always) one model; the most common wins.
  const counts = new Map<string, { run: RunRow; n: number }>();
  for (const run of runs) {
    const key = methodKey(run);
    const entry = counts.get(key) ?? { run, n: 0 };
    entry.n += 1;
    counts.set(key, entry);
  }
  const top = [...counts.values()].sort((a, b) => b.n - a.n)[0];
  return { key: methodKey(top.run), label: methodLabelOf(top.run), reps: repsOf(runs) };
}

interface PeriodSummary {
  runs: RunRow[];
  categoryRuns: RunRow[];
  score: number;
  shareOfVoice: number;
  totalAppearances: number;
  brands: Map<string, BrandAgg>;
  /** brand key -> share of category runs naming it */
  brandShares: Map<string, { display: string; isOwn: boolean; share: number }>;
  intents: Map<string, { runs: number; own: number }>;
  /** domain -> category runs citing it (one per run) */
  domainRuns: Map<string, number>;
  prompts: Map<string, { runs: number; own: number; intent: string }>;
}

function summarize(runs: RunRow[], ownDisplay?: string): PeriodSummary {
  const categoryRuns = runs.filter(isCategory);
  const brands = new Map<string, BrandAgg>();
  const intents = new Map<string, { runs: number; own: number }>();
  const domainRuns = new Map<string, number>();
  const prompts = new Map<string, { runs: number; own: number; intent: string }>();
  let own = 0;
  for (const run of categoryRuns) {
    const named = ownMentioned(run);
    if (named) own += 1;
    for (const [key, brand] of brandsInRun(run)) countBrand(brands, key, brand.name, brand.isOwn, ownDisplay);
    const intent = run.visibility_prompts?.intents?.name ?? "unknown";
    const i = intents.get(intent) ?? { runs: 0, own: 0 };
    i.runs += 1;
    if (named) i.own += 1;
    intents.set(intent, i);
    for (const domain of new Set(run.visibility_citations.map((c) => c.domain))) {
      domainRuns.set(domain, (domainRuns.get(domain) ?? 0) + 1);
    }
    const text = run.visibility_prompts?.text ?? "unknown";
    const p = prompts.get(text) ?? { runs: 0, own: 0, intent };
    p.runs += 1;
    if (named) p.own += 1;
    prompts.set(text, p);
  }
  const totalAppearances = [...brands.values()].reduce((sum, b) => sum + b.count, 0);
  const ownEntry = brands.get(OWN_KEY);
  const brandShares = new Map<string, { display: string; isOwn: boolean; share: number }>();
  for (const [key, b] of brands) {
    brandShares.set(key, { display: b.display, isOwn: b.isOwn, share: b.count / Math.max(categoryRuns.length, 1) });
  }
  return {
    runs,
    categoryRuns,
    score: own / Math.max(categoryRuns.length, 1),
    shareOfVoice: (ownEntry?.count ?? 0) / Math.max(totalAppearances, 1),
    totalAppearances,
    brands,
    brandShares,
    intents,
    domainRuns,
    prompts,
  };
}

function rankBrands(brands: Map<string, BrandAgg>): BrandAgg[] {
  // Ties break by name, so a rank never depends on the order rows arrived in.
  return [...brands.values()].sort((a, b) => b.count - a.count || a.display.localeCompare(b.display));
}

function compare(
  now: PeriodSummary,
  before: PeriodSummary,
): Omit<ChangeSummary, "comparable" | "previous" | "otherMethodPrevious" | "backingBefore" | "backingAfter"> {
  const pts = (a: number, b: number) => Math.round(a * 100) - Math.round(b * 100);

  const intents: IntentChange[] = [];
  for (const [name, after] of now.intents) {
    const prior = before.intents.get(name);
    if (!prior) continue;
    const beforeStatus = intentStatus(prior.own, prior.runs);
    const afterStatus = intentStatus(after.own, after.runs);
    if (beforeStatus === afterStatus) continue;
    intents.push({
      name,
      before: beforeStatus,
      after: afterStatus,
      beforeRate: prior.own / Math.max(prior.runs, 1),
      afterRate: after.own / Math.max(after.runs, 1),
    });
  }
  const order: Record<IntentStatus, number> = { none: 0, flicker: 1, present: 2 };
  intents.sort((a, b) => order[b.after] - order[b.before] - (order[a.after] - order[a.before]) || a.name.localeCompare(b.name));

  const brands: BrandChange[] = [];
  const keys = new Set([...now.brandShares.keys(), ...before.brandShares.keys()]);
  for (const key of keys) {
    const a = now.brandShares.get(key);
    const b = before.brandShares.get(key);
    const after = a?.share ?? 0;
    const prior = b?.share ?? 0;
    const delta = after - prior;
    // Movements under a tenth of the answers are noise between two repetitions.
    if (Math.abs(delta) < 0.1 && !(a?.isOwn || b?.isOwn)) continue;
    brands.push({ name: a?.display ?? b?.display ?? key, isOwn: Boolean(a?.isOwn || b?.isOwn), before: prior, after, delta });
  }
  brands.sort((a, b) => Number(b.isOwn) - Number(a.isOwn) || Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name));

  const minRuns = 2;
  const newSources = [...now.domainRuns.entries()]
    .filter(([domain, n]) => n >= minRuns && !before.domainRuns.has(domain))
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    .slice(0, 8);
  const goneSources = [...before.domainRuns.entries()]
    .filter(([domain, n]) => n >= minRuns && !now.domainRuns.has(domain))
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    .slice(0, 8);

  const questionsWon: QuestionChange[] = [];
  const questionsLost: QuestionChange[] = [];
  for (const [text, after] of now.prompts) {
    const prior = before.prompts.get(text);
    if (!prior) continue;
    const row = { text, intent: after.intent, before: prior.own, after: after.own, runs: after.runs };
    if (prior.own === 0 && after.own > 0) questionsWon.push(row);
    else if (prior.own > 0 && after.own === 0) questionsLost.push(row);
  }
  questionsWon.sort((a, b) => b.after - a.after || a.text.localeCompare(b.text));
  questionsLost.sort((a, b) => b.before - a.before || a.text.localeCompare(b.text));

  return {
    scoreBefore: before.score,
    scoreDelta: pts(now.score, before.score),
    sovBefore: before.shareOfVoice,
    sovDelta: pts(now.shareOfVoice, before.shareOfVoice),
    intents,
    brands: brands.slice(0, 8),
    newSources,
    goneSources,
    questionsWon,
    questionsLost,
  };
}

export interface OverviewOptions {
  /**
   * Search Console demand per question type. Applied only when the latest
   * measurement is of Google's AI (AI Mode, AI Overviews, Gemini): Google's
   * search demand and Google's answers describe one ecosystem, ChatGPT's do
   * not. Never shown as numbers; it shapes priorities and the analyst's facts.
   */
  demand?: DemandByIntent;
}

/** The assistant most runs of a period measured. */
function platformOf(runs: RunRow[]): Platform {
  const counts = new Map<Platform, number>();
  for (const run of runs) counts.set(run.platform, (counts.get(run.platform) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";
}

/** The signed-in workspace's overview, under row level security. */
export const getVisibilityOverview = cache(async function getVisibilityOverview(options: OverviewOptions = {}): Promise<VisibilityOverview> {
  const session = await requireSession();
  const supabase = await getUserClient();
  return loadVisibilityOverview(supabase, session.tenantId, options);
});

/**
 * The overview for any workspace through any client: the panel passes the
 * user's client, the cron passes the service client after a report finishes.
 * Same numbers either way.
 */
export async function loadVisibilityOverview(
  supabase: SupabaseClient,
  tenantId: string,
  options: OverviewOptions = {},
): Promise<VisibilityOverview> {
  const [runsResult, interventionsResult, profileResult] = await Promise.all([
    // Paged past the 1000-row cap, newest first.
    fetchAll<RunRow>(() =>
      supabase
        .from("visibility_runs")
        .select(
          // No answer texts here: they are the heaviest column by far and only
          // the thirty previews need them (fetched below by id).
          "id, platform, executed_on, source, model_version, visibility_prompts(text, language, intents(name, language, is_branded)), visibility_mentions(name, is_own), visibility_citations(url, domain)",
          { count: "exact" },
        )
        .eq("tenant_id", tenantId)
        .order("executed_on", { ascending: false })
        .order("id"),
    ),
    supabase
      .from("interventions")
      .select("id, kind, surface, description, performed_on")
      .eq("tenant_id", tenantId)
      .order("performed_on", { ascending: false })
      .limit(200),
    supabase
      .from("business_profiles")
      .select("name")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);

  const allRuns = runsResult.rows;
  const interventionRows = (interventionsResult.data ?? []).map((row) => ({
    id: row.id as string,
    kind: row.kind as string,
    surface: row.surface as string,
    description: row.description as string,
    performedOn: row.performed_on as string,
  }));

  const emptyMetrics: MetricsSummary = {
    brandMentionRate: 0,
    shareOfVoice: 0,
    sovRank: null,
    sovBrands: 0,
    citationRate: 0,
    ownCitedSources: [],
  };

  const empty: VisibilityOverview = {
    hasData: false,
    current: null,
    demandApplied: false,
    metrics: emptyMetrics,
    sources: [],
    dates: [],
    timeline: [],
    changes: null,
    actions: [],
    quotes: [],
    descriptors: [],
    rivalDescriptors: null,
    totalRuns: 0,
    totalCitations: 0,
    categoryRuns: 0,
    categoryOwnMentions: 0,
    intents: [],
    platforms: [],
    leaderboard: [],
    totalAppearances: 0,
    domains: [],
    ownSources: [],
    attributable: 0,
    gapSources: [],
    prompts: [],
    recentRuns: [],
    recentRunsTotal: 0,
    interventions: interventionRows.map((row) => ({ ...row, before: null, after: null })),
  };

  const readError = runsResult.error?.message ?? interventionsResult.error?.message ?? null;
  if (readError) return { ...empty, error: readError };
  if (allRuns.length === 0) return empty;

  // ── Periods, ordered by when they were actually measured ──────────────────
  const periodRuns = new Map<string, RunRow[]>();
  for (const run of allRuns) {
    const key = periodOf(run);
    periodRuns.set(key, [...(periodRuns.get(key) ?? []), run]);
  }
  const periodEnd = new Map<string, string>();
  for (const [period, rows] of periodRuns) {
    periodEnd.set(period, rows.reduce((max, run) => (run.executed_on > max ? run.executed_on : max), ""));
  }
  const periods = [...periodRuns.keys()].sort(
    (a, b) => periodEnd.get(a)!.localeCompare(periodEnd.get(b)!) || periodStart(a).localeCompare(periodStart(b)),
  );
  const periodMethod = new Map<string, MethodMeta>();
  for (const period of periods) periodMethod.set(period, methodOf(periodRuns.get(period)!));

  const currentPeriod = periods[periods.length - 1];
  const runs = periodRuns.get(currentPeriod)!;
  const currentPlatform = platformOf(runs);
  // Google demand pairs with Google's answers only.
  const demand = currentPlatform === "google_aio" ? options.demand : undefined;
  const ownDisplay = (profileResult.data as { name: string } | null)?.name;
  const now = summarize(runs, ownDisplay);
  const categoryRuns = now.categoryRuns;

  // The previous measurement made the same way, if any: the only one the
  // latest is compared with.
  const currentMethod = periodMethod.get(currentPeriod)!;
  const earlier = periods.slice(0, -1);
  const previousSame = [...earlier].reverse().find((period) => periodMethod.get(period)!.key === currentMethod.key) ?? null;
  const previousAny = earlier[earlier.length - 1] ?? null;

  // The answer texts of the latest measurement (and of the one it is
  // compared with), for per-item source attribution and quotes. Fetched by
  // date range, not by id list: a report of a thousand runs would not fit its
  // ids into one request URL.
  const textsFor = (period: string) =>
    fetchAll<{ id: string; response_text: string | null }>(() =>
      supabase
        .from("visibility_runs")
        .select("id, response_text", { count: "exact" })
        .eq("tenant_id", tenantId)
        .gte("executed_on", periodStart(period))
        .lte("executed_on", periodEnd.get(period)!)
        .order("id"),
    );
  const textResults = await Promise.all([textsFor(currentPeriod), ...(previousSame ? [textsFor(previousSame)] : [])]);
  const texts = new Map<string, string | null>();
  for (const result of textResults) for (const row of result.rows) texts.set(row.id, row.response_text);
  const ownKeys = nameKeys(ownDisplay ?? "");
  /** Domains cited at the venue's own items in a run, or null when the text is missing. */
  const ownSourcesOf = (run: RunRow): Set<string> | null => {
    const text = texts.get(run.id);
    return text && ownKeys.length ? domainsAt(text, ownKeys) : null;
  };
  /** What backs the venue's mentions across a set of runs, by answers. */
  const backingOf = (rows: RunRow[]): Array<{ domain: string; count: number }> => {
    const counts = new Map<string, number>();
    for (const run of rows) {
      if (!isCategory(run) || !ownMentioned(run)) continue;
      for (const domain of ownSourcesOf(run) ?? []) counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([domain, count]) => ({ domain, count }));
  };
  /** Folded tokens of every venue named, so a rival's name never counts as a descriptor. */
  const venueTokens = new Set<string>();
  for (const brand of now.brands.values()) for (const word of foldLetters(brand.display).split(/[^a-z0-9]+/)) if (word) venueTokens.add(word);

  // ── Per intent: ownership table and the venue's own status ────────────────
  const byIntent = new Map<string, RunRow[]>();
  for (const run of runs) {
    const intent = run.visibility_prompts?.intents?.name ?? "unknown";
    byIntent.set(intent, [...(byIntent.get(intent) ?? []), run]);
  }

  const intents: IntentSummary[] = [...byIntent.entries()].map(([name, intentRuns]) => {
    const meta = intentRuns[0].visibility_prompts?.intents;
    const ownMentions = intentRuns.filter(ownMentioned).length;
    const ownerCounts = new Map<string, BrandAgg>();
    for (const run of intentRuns) {
      for (const [key, brand] of brandsInRun(run)) countBrand(ownerCounts, key, brand.name, brand.isOwn, ownDisplay);
    }
    const rankedOwners = rankBrands(ownerCounts);
    const owners = rankedOwners.slice(0, 5).map((entry) => ({
      name: entry.display,
      isOwn: entry.isOwn,
      count: entry.count,
      share: entry.count / intentRuns.length,
    }));

    // The questions behind the type, each with the venue's result.
    const byQuestion = new Map<string, QuestionRow>();
    for (const run of intentRuns) {
      const text = run.visibility_prompts?.text ?? "unknown";
      const row = byQuestion.get(text) ?? { text, language: run.visibility_prompts?.language ?? "pl", runs: 0, own: 0, status: "single" as QuestionStatus };
      row.runs += 1;
      if (ownMentioned(run)) row.own += 1;
      byQuestion.set(text, row);
    }
    const questions = [...byQuestion.values()]
      .map((row) => ({ ...row, status: questionStatus(row.own, row.runs) }))
      .sort((a, b) => b.own / b.runs - a.own / a.runs || a.text.localeCompare(b.text));

    // The leading rival for this type and what the assistants cite when naming
    // them: the footnote at the rival's own item when the text is stored,
    // every citation of the answer otherwise.
    const leaderEntry = rankedOwners.find((entry) => !entry.isOwn) ?? null;
    let leader: IntentSummary["leader"] = null;
    if (leaderEntry) {
      const leaderKey = [...ownerCounts.entries()].find(([, entry]) => entry === leaderEntry)?.[0];
      const leaderKeys = nameKeys(leaderEntry.display);
      const cited = new Map<string, number>();
      for (const run of intentRuns) {
        if (!leaderKey || !brandsInRun(run).has(leaderKey)) continue;
        const text = texts.get(run.id);
        const domains = text ? domainsAt(text, leaderKeys) : new Set(run.visibility_citations.map((c) => c.domain));
        for (const domain of domains) cited.set(domain, (cited.get(domain) ?? 0) + 1);
      }
      leader = {
        name: leaderEntry.display,
        share: leaderEntry.count / intentRuns.length,
        sources: [...cited.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 3)
          .map(([domain, count]) => ({ domain, count })),
      };
    }

    const status = intentStatus(ownMentions, intentRuns.length);
    const isBranded = meta?.is_branded ?? false;
    // What is at stake is the answers that do not name the venue yet. A
    // flickering type is the cheapest to win, an absent one the plainest, a
    // partly won big type the largest pool. Google demand, when known, scales
    // it: a type people search a thousand times a month weighs double.
    const winnability = status === "flicker" ? 1.3 : status === "none" ? 1 : 0.8;
    const typeDemand = demand?.[name] ?? null;
    const demandWeight = typeDemand ? 1 + Math.min(typeDemand.impressions, 5000) / 1000 : 1;
    return {
      name,
      language: meta?.language ?? "pl",
      isBranded,
      runs: intentRuns.length,
      ownMentions,
      status,
      owners,
      questions,
      leader,
      demand: typeDemand,
      priority: isBranded ? 0 : (intentRuns.length - ownMentions) * winnability * demandWeight,
    };
  });
  intents.sort((a, b) => Number(a.isBranded) - Number(b.isBranded) || b.priority - a.priority || a.name.localeCompare(b.name));

  // ── Share of voice across category runs ───────────────────────────────────
  const ranked = rankBrands(now.brands);
  const leaderboard: LeaderboardRow[] = ranked.map((entry) => ({
    name: entry.display,
    isOwn: entry.isOwn,
    runsMentioned: entry.count,
    share: entry.count / Math.max(categoryRuns.length, 1),
    sovShare: entry.count / Math.max(now.totalAppearances, 1),
  }));
  // The venue always appears on its own leaderboard, even at zero.
  if (!leaderboard.some((row) => row.isOwn)) {
    leaderboard.push({ name: ownDisplay ?? "This venue", isOwn: true, runsMentioned: 0, share: 0, sovShare: 0 });
  }

  // ── The four headline metrics (see MetricsSummary) ────────────────────────
  const ownEntry = now.brands.get(OWN_KEY);
  const ownRankIndex = ranked.findIndex((entry) => entry.isOwn);
  const ownTokens = ownPresenceTokens(ownDisplay ?? "");
  let ownCitedRuns = 0;
  const ownCitedSources = new Set<string>();
  if (ownTokens.length > 0) {
    for (const run of categoryRuns) {
      const ownCitations = run.visibility_citations.filter((citation) => citesOwnPresence(citation, ownTokens));
      if (ownCitations.length === 0) continue;
      ownCitedRuns += 1;
      for (const citation of ownCitations) ownCitedSources.add(ownCitationLabel(citation));
    }
  }

  const metrics: MetricsSummary = {
    brandMentionRate: now.score,
    shareOfVoice: now.shareOfVoice,
    sovRank: ownEntry && ownEntry.count > 0 ? ownRankIndex + 1 : null,
    sovBrands: now.brands.size,
    citationRate: ownCitedRuns / Math.max(categoryRuns.length, 1),
    ownCitedSources: [...ownCitedSources].sort(),
  };

  // ── Per platform: own mention rate and citation diet ──────────────────────
  const platforms: PlatformSummary[] = (["chatgpt", "google_aio", "perplexity"] as Platform[]).map((platform) => {
    const platformRuns = categoryRuns.filter((run) => run.platform === platform);
    return {
      platform,
      runs: platformRuns.length,
      ownMentions: platformRuns.filter(ownMentioned).length,
      topDomains: topCounts(platformRuns.flatMap((run) => run.visibility_citations.map((c) => c.domain)), 5),
    };
  });

  // ── Full source table: domain x platform, with own-mention correlation ────
  // Category runs only: a branded question ("tell me about X") cites the
  // venue's own site almost by definition and would inflate every count.
  const domainMap = new Map<string, DomainRow>();
  let attributable = 0;
  for (const run of categoryRuns) {
    const ownHere = ownMentioned(run);
    const atOwnItem = ownHere ? ownSourcesOf(run) : null;
    if (texts.get(run.id)) attributable += 1;
    const seen = new Set<string>();
    for (const citation of run.visibility_citations) {
      const row =
        domainMap.get(citation.domain) ??
        ({
          domain: citation.domain,
          category: classifyDomain(citation.domain),
          total: 0,
          byPlatform: { chatgpt: 0, google_aio: 0, perplexity: 0 },
          runsWithOwnMention: 0,
          backsYou: 0,
        } satisfies DomainRow);
      row.total += 1;
      if (run.platform !== "other") row.byPlatform[run.platform] += 1;
      if (ownHere && !seen.has(citation.domain)) {
        row.runsWithOwnMention += 1;
        if (atOwnItem?.has(citation.domain)) row.backsYou = (row.backsYou ?? 0) + 1;
        seen.add(citation.domain);
      }
      domainMap.set(citation.domain, row);
    }
  }
  if (attributable === 0) for (const row of domainMap.values()) row.backsYou = null;
  const domains = [...domainMap.values()]
    .sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain))
    .slice(0, 25);
  const ownSources = backingOf(categoryRuns);

  // ── Gap sources: what the assistants read when they recommend someone else ─
  // With the texts stored, a domain counts for a rival only when it is cited
  // at that rival's own item; without them, every citation of the answer does.
  const withOwn = new Set<string>();
  // Rivals keyed the same way as the leaderboard, shown under their usual spelling.
  const rivalOnly = new Map<string, { count: number; rivals: Map<string, number> }>();
  const rivalDisplay = (key: string) => now.brands.get(key)?.display ?? key;
  for (const run of categoryRuns) {
    const cited = new Set(run.visibility_citations.map((c) => c.domain));
    if (ownMentioned(run)) {
      for (const domain of ownSourcesOf(run) ?? cited) withOwn.add(domain);
      continue;
    }
    const rivals = [...brandsInRun(run).entries()].filter(([, b]) => !b.isOwn);
    if (rivals.length === 0) continue;
    const text = texts.get(run.id);
    const perDomain = new Map<string, Set<string>>();
    if (text) {
      for (const [key, rival] of rivals) {
        for (const domain of domainsAt(text, nameKeys(rival.name))) {
          perDomain.set(domain, (perDomain.get(domain) ?? new Set()).add(key));
        }
      }
    } else {
      for (const domain of cited) perDomain.set(domain, new Set(rivals.map(([key]) => key)));
    }
    for (const [domain, keys] of perDomain) {
      const entry = rivalOnly.get(domain) ?? { count: 0, rivals: new Map() };
      entry.count += 1;
      for (const key of keys) entry.rivals.set(key, (entry.rivals.get(key) ?? 0) + 1);
      rivalOnly.set(domain, entry);
    }
  }
  const gapSources: GapSource[] = [...rivalOnly.entries()]
    .filter(([domain, entry]) => entry.count >= 2 && !withOwn.has(domain))
    .map(([domain, entry]) => {
      const rivals = [...entry.rivals.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([key]) => rivalDisplay(key));
      const host = domain.toLowerCase().replace(/^www\./, "");
      // A rival's own site is read when the rival is recommended; the lesson
      // is what that site contains, not how to get listed on it.
      const ownerRival =
        SOCIAL.test(host)
          ? null
          : (rivals.find((name) => ownPresenceTokens(name).some((token) => host.includes(token))) ?? null);
      return { domain, category: classifyDomain(domain), count: entry.count, rivals, ownerRival };
    })
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    .slice(0, 8);

  // ── Per prompt drill down ─────────────────────────────────────────────────
  const promptMap = new Map<string, PromptSummary>();
  for (const run of runs) {
    const text = run.visibility_prompts?.text ?? "unknown";
    const entry =
      promptMap.get(text) ??
      ({
        text,
        intent: run.visibility_prompts?.intents?.name ?? "unknown",
        isBranded: run.visibility_prompts?.intents?.is_branded ?? false,
        language: run.visibility_prompts?.language ?? "pl",
        runs: 0,
        ownMentions: 0,
        platforms: [],
      } satisfies PromptSummary);
    entry.runs += 1;
    if (ownMentioned(run)) entry.ownMentions += 1;
    if (!entry.platforms.includes(run.platform)) entry.platforms.push(run.platform);
    promptMap.set(text, entry);
  }
  const prompts = [...promptMap.values()].sort(
    (a, b) => Number(a.isBranded) - Number(b.isBranded) || b.ownMentions - a.ownMentions || a.intent.localeCompare(b.intent),
  );

  // ── Raw responses, own mentions first so the interesting ones surface ─────
  const previewRuns = [...runs]
    .sort((a, b) => Number(ownMentioned(b)) - Number(ownMentioned(a)) || a.id.localeCompare(b.id))
    .slice(0, 30);
  const recentRuns: RunPreview[] = previewRuns.map((run) => ({
    id: run.id,
    platform: run.platform,
    executedOn: run.executed_on,
    prompt: run.visibility_prompts?.text ?? "unknown",
    intent: run.visibility_prompts?.intents?.name ?? "unknown",
    mentionedOwn: ownMentioned(run),
    mentions: run.visibility_mentions.map((m) => m.name),
    citations: [...new Set(run.visibility_citations.map((c) => c.domain))].slice(0, 8),
    responseText: texts.get(run.id) ?? null,
  }));

  // ── What the assistants say: quotes naming the venue, and the words around it ─
  const ownSentences: Array<{ prompt: string; text: string }> = [];
  for (const run of categoryRuns) {
    if (!ownMentioned(run)) continue;
    const text = texts.get(run.id);
    if (!text) continue;
    for (const sentence of sentencesOf(text)) {
      if (namesSentence(sentence, ownKeys)) ownSentences.push({ prompt: run.visibility_prompts?.text ?? "", text: sentence });
    }
  }
  const quotes: Quote[] = [];
  const quotedPrompts = new Set<string>();
  for (const s of [...ownSentences].sort((a, b) => b.text.length - a.text.length)) {
    if (quotedPrompts.has(s.prompt) || s.text.length > 260) continue;
    quotedPrompts.add(s.prompt);
    quotes.push(s);
    if (quotes.length === 3) break;
  }
  const descriptors = descriptorsOf(ownSentences.map((s) => s.text), venueTokens);

  const topRival = ranked.find((entry) => !entry.isOwn) ?? null;
  let rivalDescriptors: VisibilityOverview["rivalDescriptors"] = null;
  if (topRival) {
    const rivalKeys = nameKeys(topRival.display);
    const rivalSentences: string[] = [];
    for (const run of categoryRuns) {
      const text = texts.get(run.id);
      if (!text) continue;
      for (const sentence of sentencesOf(text)) if (namesSentence(sentence, rivalKeys)) rivalSentences.push(sentence);
    }
    const words = descriptorsOf(rivalSentences, venueTokens);
    if (words.length > 0) rivalDescriptors = { name: topRival.display, words };
  }

  // ── Score per measurement period, across the whole history ─────────────────
  const timeline: TrendPoint[] = periods.map((period) => {
    const rows = periodRuns.get(period)!.filter(isCategory);
    const own = rows.filter(ownMentioned).length;
    return {
      date: periodStart(period),
      endDate: periodEnd.get(period)!,
      period,
      label: periodLabel(period),
      runs: rows.length,
      ownMentions: own,
      score: own / Math.max(rows.length, 1),
      interventions: interventionRows.filter((item) => periodContains(period, item.performedOn)).length,
      method: periodMethod.get(period)!,
    };
  });

  // ── What changed since the previous measurement made the same way ─────────
  let changes: ChangeSummary | null = null;
  if (previousAny) {
    const otherMethodPrevious =
      previousAny !== previousSame
        ? { label: periodLabel(previousAny), method: periodMethod.get(previousAny)!.label }
        : null;
    if (previousSame) {
      const previousRuns = periodRuns.get(previousSame)!;
      const before = summarize(previousRuns, ownDisplay);
      changes = {
        comparable: true,
        previous: { period: previousSame, label: periodLabel(previousSame), categoryRuns: before.categoryRuns.length },
        otherMethodPrevious,
        ...compare(now, before),
        backingBefore: backingOf(previousRuns).slice(0, 4),
        backingAfter: ownSources.slice(0, 4),
      };
    } else {
      changes = {
        comparable: false,
        previous: null,
        otherMethodPrevious,
        scoreBefore: null,
        scoreDelta: null,
        sovBefore: null,
        sovDelta: null,
        intents: [],
        brands: [],
        newSources: [],
        goneSources: [],
        questionsWon: [],
        questionsLost: [],
        backingBefore: [],
        backingAfter: [],
      };
    }
  }

  // ── This month's plan: every action the measurement supports, by answers at stake ─
  const fmtPct = (rate: number) => `${Math.round(rate * 100)}%`;
  const candidates: Array<ActionItem & { weight: number }> = [];
  // Types with answers still to win: absent ones, flickering ones, and big
  // ones only partly won. Already ordered by what is at stake.
  for (const intent of intents.filter((i) => !i.isBranded && i.ownMentions < i.runs && i.priority >= 3).slice(0, 4)) {
    const lead = intent.leader;
    const read = lead?.sources.length ? `, read from ${lead.sources.map((s) => s.domain).join(", ")}` : "";
    const verb = intent.status === "none" ? "Get into" : intent.status === "flicker" ? "Hold on to" : "Grow in";
    const google = intent.demand ? ` People search Google for this ${intent.demand.impressions.toLocaleString("en-GB")} times a month.` : "";
    candidates.push({
      kind: "intent",
      title: `${verb} "${intent.name}" questions`,
      why: lead
        ? `${intent.runs} answers; you are named in ${intent.ownMentions}. ${lead.name} is named in ${fmtPct(lead.share)}${read}.${google}`
        : `${intent.runs} answers; you are named in ${intent.ownMentions} and no rival dominates yet.${google}`,
      affects: intent.runs - intent.ownMentions,
      href: "#types",
      weight: (intent.status === "flicker" ? 1.3 : intent.status === "none" ? 1 : 0.8) * (intent.demand ? 1 + Math.min(intent.demand.impressions, 5000) / 1000 : 1),
    });
  }
  const flickering = intents
    .filter((i) => !i.isBranded)
    .flatMap((i) => i.questions.filter((q) => q.status === "flicker").map((q) => ({ ...q, intent: i.name })))
    .sort((a, b) => b.runs - a.runs || a.text.localeCompare(b.text))
    .slice(0, 3);
  for (const q of flickering) {
    candidates.push({
      kind: "flicker",
      title: `Stabilise "${q.text}"`,
      why: `Named in ${q.own} of ${q.runs} repetitions. The assistant already considers you; one more page or listing tips it.`,
      affects: q.runs,
      href: "#types",
      weight: 1.6,
    });
  }
  for (const q of (changes?.questionsLost ?? []).slice(0, 2)) {
    candidates.push({
      kind: "lost",
      title: `Recover "${q.text}"`,
      why: `Named in ${q.before} of ${q.runs} answers last time, ${q.after} now. Check what changed on the pages the assistants read for it.`,
      affects: q.runs,
      href: "#types",
      weight: 1.5,
    });
  }
  const gapTitle = (g: GapSource) =>
    g.category === "Reddit"
      ? `Get recommended in the ${g.domain} threads the assistants read`
      : g.category === "Social"
        ? `Show up on ${g.domain}`
        : g.category === "Google"
          ? "Complete your Google Business Profile"
          : `Get listed on ${g.domain}`;
  for (const gap of gapSources.filter((g) => !g.ownerRival).slice(0, 2)) {
    candidates.push({
      kind: "guide",
      title: gapTitle(gap),
      why: `Cited at a rival's item in ${gap.count} answers (${gap.rivals.slice(0, 2).join(", ")}) and never at yours.`,
      affects: gap.count,
      href: "#gaps",
      weight: 1.3,
    });
  }
  const rivalSites = gapSources.filter((g) => g.ownerRival);
  if (rivalSites.length > 0) {
    const total = rivalSites.reduce((sum, g) => sum + g.count, 0);
    candidates.push({
      kind: "rival_site",
      title: `Match what ${rivalSites.map((g) => g.ownerRival).slice(0, 2).join(" and ")} publish on their own sites`,
      why: `${rivalSites.map((g) => g.domain).join(", ")} are cited in ${total} answers recommending them. Menu with prices, hours, district and a FAQ are what gets quoted.`,
      affects: total,
      href: "#gaps",
      weight: 0.9,
    });
  }
  if (metrics.citationRate < 0.3) {
    candidates.push({
      kind: "citation",
      title: ownCitedRuns === 0 ? "Make your website a source the assistants can quote" : "Make more of your website quotable",
      why: `Your site is cited in ${fmtPct(metrics.citationRate)} of answers. Assistants recommend from pages they can read: facts in plain text, not only in images.`,
      affects: categoryRuns.length - ownCitedRuns,
      href: "#sources",
      weight: 0.8,
    });
  }
  const actions: ActionItem[] = candidates
    .sort((a, b) => b.affects * b.weight - a.affects * a.weight || a.title.localeCompare(b.title))
    .slice(0, 6)
    .map((c) => ({ kind: c.kind, title: c.title, why: c.why, affects: c.affects, href: c.href }));

  // ── Interventions with the comparable score before and after each ─────────
  const sameMethodPoints = timeline.filter((point) => point.method.key === currentMethod.key);
  const interventions: InterventionRow[] = interventionRows.map((row) => {
    const before = [...sameMethodPoints].reverse().find((point) => point.endDate <= row.performedOn) ?? null;
    const after = sameMethodPoints.find((point) => point.date > row.performedOn) ?? null;
    return {
      ...row,
      before: before ? { label: before.label, score: before.score } : null,
      after: after ? { label: after.label, score: after.score } : null,
    };
  });

  return {
    hasData: true,
    current: {
      period: currentPeriod,
      label: periodLabel(currentPeriod),
      start: periodStart(currentPeriod),
      end: periodEnd.get(currentPeriod)!,
      runs: runs.length,
      categoryRuns: categoryRuns.length,
      method: currentMethod,
      platform: currentPlatform,
    },
    demandApplied: Boolean(demand),
    metrics,
    sources: [...new Set(runs.map((run) => run.source))],
    dates: periods.map(periodStart),
    timeline,
    changes,
    actions,
    quotes,
    descriptors,
    rivalDescriptors,
    totalRuns: runs.length,
    totalCitations: categoryRuns.reduce((sum, run) => sum + run.visibility_citations.length, 0),
    categoryRuns: categoryRuns.length,
    categoryOwnMentions: categoryRuns.filter(ownMentioned).length,
    intents,
    platforms,
    leaderboard,
    totalAppearances: now.totalAppearances,
    domains,
    ownSources,
    attributable,
    gapSources,
    prompts,
    recentRuns,
    recentRunsTotal: runs.length,
    interventions,
  };
}

/**
 * Appends to the interventions ledger. Failures are logged, never thrown: an
 * intervention record must not break the action it describes.
 */
export async function logIntervention(input: {
  kind: "record_update" | "review_reply" | "site_change" | "guide_entry" | "social_post" | "other";
  surface: string;
  description: string;
  /** ISO date; defaults to today in the database. */
  performedOn?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; message?: string }> {
  try {
    const session = await requireSession();
    const supabase = await getUserClient();
    const result = await supabase.from("interventions").insert({
      tenant_id: session.tenantId,
      kind: input.kind,
      surface: input.surface,
      description: input.description,
      ...(input.performedOn ? { performed_on: input.performedOn } : {}),
      actor_user_id: session.userId,
      metadata: input.metadata ?? {},
    });
    if (result.error) {
      console.warn("[interventions]", result.error.message);
      return { ok: false, message: result.error.message };
    }
    return { ok: true };
  } catch (error) {
    console.warn("[interventions]", (error as Error).message);
    return { ok: false, message: (error as Error).message };
  }
}
