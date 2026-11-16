import "server-only";

import { periodPhrase } from "@/lib/periods";
import { countMovement, detectablePoints, movement, rangeLabel, wilson } from "@/lib/stats-math";
import { KEY_BOTS, type WeekTraffic } from "@/services/stats";
import { ASSISTANT_NAME, type IntentStatus, type VisibilityOverview } from "@/services/visibility";

/**
 * What the report says, worked out by rules.
 *
 * The panel holds a lot of numbers; an owner needs the few sentences an
 * analyst would open with. Every sentence here is produced by a rule over
 * numbers already on the page, and every rule that compares two numbers
 * first asks whether the difference is more than chance (lib/stats-math).
 * No model is involved: the same data always yields the same sentences.
 *
 * `weight` is the order an analyst would speak in: a real movement first,
 * then a real gap between assistants, then where the venue stands, then the
 * leads that one more report has to confirm.
 */

export type InsightTone = "good" | "bad" | "watch" | "neutral";

export type InsightArea = "answers" | "assistants" | "questions" | "rivals" | "sources" | "traffic" | "crawlers";

export interface Insight {
  id: string;
  area: InsightArea;
  tone: InsightTone;
  /** One sentence with its numbers. */
  title: string;
  /** What stands behind it, or what it means. */
  detail: string;
  /** Where in the panel the evidence is. */
  href?: string;
  /** The series the finding is about, when it is about one assistant. */
  series?: string;
  weight: number;
}

export const AREA_LABEL: Record<InsightArea, string> = {
  answers: "AI answers",
  assistants: "Assistants",
  questions: "Questions",
  rivals: "Competitors",
  sources: "Sources",
  traffic: "Website",
  crawlers: "AI crawlers",
};

const pct = (rate: number | null | undefined) => `${Math.round((rate ?? 0) * 100)}%`;
const signed = (n: number) => `${n > 0 ? "+" : ""}${n}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const STATUS_WORD: Record<IntentStatus, string> = { none: "absent", flicker: "flickering", present: "present" };
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** What one assistant's measurement says on its own. */
function forAssistant(o: VisibilityOverview, many: boolean): Insight[] {
  const out: Insight[] = [];
  const cur = o.current;
  if (!cur) return out;
  const assistant = ASSISTANT_NAME[cur.platform];
  const who = many ? `${assistant}: ` : "";
  const say = (text: string) => (many ? `${who}${text}` : upperFirst(text));
  /** Stamps the finding with the series it is about. */
  const add = (insight: Insight) => out.push({ ...insight, series: cur.seriesId });
  const q = `?series=${cur.seriesId}`;
  const id = (name: string) => `${name}-${cur.seriesId}`;
  const n = o.categoryRuns;
  const k = o.categoryOwnMentions;
  const rate = o.metrics.brandMentionRate;
  const c = o.changes;

  // ── Where the venue stands, and whether that moved ──────────────────────
  if (c?.comparable && c.previous) {
    const prev = c.previous;
    const inPrev = periodPhrase(prev.period);
    const sincePrev = periodPhrase(prev.period, "since");
    const verdict = movement(prev.ownMentions, prev.categoryRuns, k, n);
    const delta = c.scoreDelta ?? 0;
    if (verdict === "noise") {
      add({
        id: id("score"),
        area: "answers",
        tone: "neutral",
        weight: 60,
        title: say(`named in ${pct(rate)} of answers, no real change`),
        detail: `${pct(c.scoreBefore)} ${inPrev}, ${pct(rate)} now (${signed(delta)} points). Two measurements of an unchanged venue differ this much by chance; with these samples a change counts from about ${detectablePoints(prev.categoryRuns, n, rate)} points.`,
        href: `/visibility${q}`,
      });
    } else {
      add({
        id: id("score"),
        area: "answers",
        tone: verdict === "up" ? "good" : "bad",
        weight: 100,
        title: say(`named in answers ${verdict === "up" ? "rose" : "fell"} from ${pct(c.scoreBefore)} to ${pct(rate)}`),
        detail: `${signed(delta)} points ${sincePrev}: ${prev.ownMentions} of ${prev.categoryRuns} answers then, ${k} of ${n} now. More than chance between two measurements explains, so this is a real ${verdict === "up" ? "gain" : "loss"}.`,
        href: `/visibility${q}`,
      });
    }

    // Question types that changed status. A type holds few answers, so the
    // change is tested like everything else: a status can flip by chance.
    for (const move of c.intents.slice(0, 4)) {
      const gained = move.after === "present" || (move.after === "flicker" && move.before === "none");
      const real = movement(move.beforeOwn, move.beforeRuns, move.afterOwn, move.afterRuns) !== "noise";
      const counts = `${move.beforeOwn} of ${move.beforeRuns} answers ${inPrev}, ${move.afterOwn} of ${move.afterRuns} now`;
      add(
        real
          ? {
              id: id(`type-${move.name}`),
              area: "questions",
              tone: gained ? "good" : "bad",
              weight: move.after === "none" ? 72 : 70,
              title: say(`"${move.name}" questions went from ${STATUS_WORD[move.before]} to ${STATUS_WORD[move.after]}`),
              detail: `Named in ${counts}. More than chance explains, so this is a real ${gained ? "gain" : "loss"} for the type.`,
              href: `/visibility/questions${q}`,
            }
          : {
              id: id(`type-${move.name}`),
              area: "questions",
              tone: "neutral",
              weight: 32,
              title: say(`"${move.name}" questions read ${STATUS_WORD[move.after]} now, ${STATUS_WORD[move.before]} before`),
              detail: `Named in ${counts}. With so few answers the difference is one chance produces; if the next report says the same, it is a finding.`,
              href: `/visibility/questions${q}`,
            },
      );
    }

    if (c.questionsLost.length > 0) {
      add({
        id: id("lost"),
        area: "questions",
        tone: "bad",
        weight: 40 + Math.min(c.questionsLost.length, 6),
        title: say(`${plural(c.questionsLost.length, "question")} you were named for no longer name you`),
        detail: `${c.questionsLost.slice(0, 3).map((row) => `"${row.text}" (${row.before} of ${row.runs} then, ${row.after} now)`).join("; ")}${c.questionsLost.length > 3 ? `; and ${c.questionsLost.length - 3} more` : ""}. A question is asked only a few times, so each is a lead until the next report repeats it.`,
        href: `/visibility/questions${q}`,
      });
    }
    if (c.questionsWon.length > 0) {
      add({
        id: id("won"),
        area: "questions",
        tone: "good",
        weight: 38 + Math.min(c.questionsWon.length, 6),
        title: say(`${plural(c.questionsWon.length, "question")} name you that did not before`),
        detail: `${c.questionsWon.slice(0, 3).map((row) => `"${row.text}" (${row.after} of ${row.runs} now)`).join("; ")}${c.questionsWon.length > 3 ? `; and ${c.questionsWon.length - 3} more` : ""}. A question is asked only a few times, so each is a lead until the next report repeats it.`,
        href: `/visibility/questions${q}`,
      });
    }

    // Rivals whose share really moved.
    let rivalInsights = 0;
    for (const rival of c.brands.filter((b) => !b.isOwn)) {
      if (rivalInsights === 2) break;
      const verdictRival = movement(Math.round(rival.before * prev.categoryRuns), prev.categoryRuns, Math.round(rival.after * n), n);
      if (verdictRival === "noise") continue;
      rivalInsights += 1;
      add({
        id: id(`rival-${rival.name}`),
        area: "rivals",
        tone: verdictRival === "up" ? "watch" : "good",
        weight: verdictRival === "up" ? 52 : 31,
        title: say(`${rival.name} is named ${verdictRival === "up" ? "more" : "less"} often: ${pct(rival.before)} to ${pct(rival.after)} of answers`),
        detail:
          verdictRival === "up"
            ? `A real rise ${sincePrev}, not chance. Head to head shows the questions they win and the pages the assistant reads for them.`
            : `A real fall ${sincePrev}. The answers they left are open to whoever the assistant can quote.`,
        href: `/visibility/share${q}&rival=${encodeURIComponent(rival.name)}`,
      });
    }

    // A new source standing behind the venue's own mentions.
    const backedBefore = new Set(c.backingBefore.map((s) => s.domain));
    const newBacking = c.backingAfter.filter((s) => !backedBefore.has(s.domain));
    if (newBacking.length > 0 && c.backingBefore.length + c.backingAfter.length > 0) {
      add({
        id: id("backing"),
        area: "sources",
        tone: "good",
        weight: 33,
        title: say(`${newBacking.map((s) => s.domain).slice(0, 2).join(" and ")} now ${newBacking.length === 1 ? "backs" : "back"} your mentions`),
        detail: `Cited at the very items that name you (${newBacking.slice(0, 2).map((s) => `${s.domain} in ${plural(s.count, "answer")}`).join(", ")}), which was not the case ${inPrev}.`,
        href: `/visibility/sources${q}`,
      });
    }
  } else {
    add({
      id: id("score"),
      area: "answers",
      tone: "neutral",
      weight: 60,
      title: say(`named in ${pct(rate)} of answers (${k} of ${n})`),
      detail: `The first measurement made this way, so there is nothing to compare it with yet. With ${n} answers the true rate plausibly lies between ${rangeLabel(wilson(k, n))}; the next report shows whether it moves.`,
      href: `/visibility${q}`,
    });
  }

  // ── Answers given from memory, without a search ─────────────────────────
  const aside = o.setAside;
  if (aside) {
    // The finding worth saying: with a search the assistant finds the venue, from memory it does not.
    const onlyWhenSearching = aside.named === 0 && rate >= 0.2;
    add({
      id: id("memory"),
      area: "answers",
      tone: onlyWhenSearching ? "watch" : "neutral",
      weight: onlyWhenSearching ? 48 : 20,
      title: say(
        aside.named === 0
          ? `${plural(aside.answers, "answer")} came from memory, without a search, and none named you`
          : `${plural(aside.answers, "answer")} came from memory, without a search; ${aside.named} named you`,
      ),
      detail:
        `They are kept out of the score, which counts the ${n} answers built on a search, and the same questions were asked again with a search.` +
        (onlyWhenSearching
          ? ` It shows where your visibility comes from: ${assistant} names you in ${pct(rate)} of answers when it searches and never from what it already knows, so it rests on the pages search returns today.`
          : ""),
      href: `/visibility/answers${q}`,
    });
  }

  // ── Position among the venues named ─────────────────────────────────────
  const leader = o.leaderboard.find((row) => !row.isOwn) ?? null;
  if (leader && o.metrics.sovRank === 1 && k > 0) {
    add({
      id: id("lead"),
      area: "rivals",
      tone: "good",
      weight: 38,
      title: say(`you are the venue named most often`),
      detail: `${pct(rate)} of answers name you; next is ${leader.name} with ${pct(leader.share)}, among ${o.metrics.sovBrands} venues named for the same questions.`,
      href: `/visibility/share${q}`,
    });
  } else if (leader && leader.share - rate >= 0.15) {
    add({
      id: id("lead"),
      area: "rivals",
      tone: "watch",
      weight: 36,
      title: say(`${leader.name} leads with ${pct(leader.share)} of answers, you have ${pct(rate)}`),
      detail: o.metrics.sovRank
        ? `You rank #${o.metrics.sovRank} of ${o.metrics.sovBrands} venues named for the same questions.`
        : `No answer names you yet; ${o.metrics.sovBrands} venues are named for the same questions.`,
      href: `/visibility/share${q}`,
    });
  }

  // ── Question types never won, and questions that flicker ────────────────
  const types = o.intents.filter((i) => !i.isBranded);
  const absent = types.filter((i) => i.status === "none");
  if (absent.length > 0 && types.length > 0) {
    add({
      id: id("absent"),
      area: "questions",
      tone: "watch",
      weight: 34,
      title: say(`never named for ${absent.length} of ${plural(types.length, "question type")}`),
      detail: `${absent.slice(0, 3).map((i) => `"${i.name}"${i.leader ? ` (${i.leader.name} leads with ${pct(i.leader.share)})` : ""}`).join("; ")}${absent.length > 3 ? `; and ${absent.length - 3} more` : ""}.`,
      href: `/visibility/questions${q}`,
    });
  }
  const flickering = types.flatMap((i) => i.questions.filter((row) => row.status === "flicker"));
  if (flickering.length > 0) {
    add({
      id: id("flicker"),
      area: "questions",
      tone: "watch",
      weight: 27,
      title: say(`${plural(flickering.length, "question")} ${flickering.length === 1 ? "names" : "name"} you only some of the time`),
      detail: `${flickering.slice(0, 2).map((row) => `"${row.text}" (${row.own} of ${row.runs})`).join("; ")}. The assistant already considers you there; these are the cheapest answers to win.`,
      href: `/visibility/questions${q}`,
    });
  }

  // ── What the assistant reads ────────────────────────────────────────────
  if (o.metrics.citationRate === 0) {
    add({
      id: id("cited"),
      area: "sources",
      tone: "watch",
      weight: 30,
      title: say(`your own website is never cited as a source`),
      detail:
        o.ownSources.length > 0
          ? `Where you are named, the assistant quotes ${o.ownSources.slice(0, 3).map((s) => s.domain).join(", ")} instead. It recommends from pages it can read facts on.`
          : `It describes you from other people's pages or from memory. It recommends from pages it can read facts on.`,
      href: `/visibility/sources${q}`,
    });
  }
  const gap = o.gapSources.find((g) => !g.ownerRival);
  if (gap) {
    add({
      id: id("gap"),
      area: "sources",
      tone: "watch",
      weight: 28,
      title: say(`${gap.domain} backs your rivals in ${plural(gap.count, "answer")} and never you`),
      detail: `Cited where ${gap.rivals.slice(0, 2).join(" and ")} ${gap.rivals.length === 1 ? "is" : "are"} recommended. A page the assistant already trusts; being on it is a direct route into those answers.`,
      href: `/visibility/sources${q}`,
    });
  }
  return out;
}

/** What the assistants of one report say when put side by side. */
function acrossAssistants(list: VisibilityOverview[]): Insight[] {
  const out: Insight[] = [];
  const cmp = list[0]?.comparison;
  if (!cmp || cmp.columns.length < 2) return out;
  const [a, b] = cmp.columns;
  const verdict = movement(a.ownMentions, a.categoryRuns, b.ownMentions, b.categoryRuns);
  const high = a.score >= b.score ? a : b;
  const low = high === a ? b : a;
  const rows = cmp.intents
    .map((row) => ({ name: row.name, a: row.cells[0], b: row.cells[1] }))
    .filter((row) => row.a.runs >= 2 && row.b.runs >= 2);

  if (verdict === "noise") {
    out.push({
      id: "assistants-agree",
      area: "assistants",
      tone: "neutral",
      weight: 24,
      title: `${a.assistant} and ${b.assistant} name you about equally often (${pct(a.score)} and ${pct(b.score)})`,
      detail: `Asked the same questions in the same period. The difference is one chance produces; the assistants still differ type by type.`,
      href: "/visibility/assistants",
    });
  } else {
    const drivers = rows
      .map((row) => {
        const hi = high === a ? row.a : row.b;
        const lo = high === a ? row.b : row.a;
        return { name: row.name, hi, lo, diff: hi.own / hi.runs - lo.own / lo.runs };
      })
      .filter((row) => row.diff >= 0.25)
      .sort((x, y) => y.diff - x.diff)
      .slice(0, 3);
    out.push({
      id: "assistants-gap",
      area: "assistants",
      tone: "watch",
      weight: 82,
      title: `${high.assistant} names you in ${pct(high.score)} of answers, ${low.assistant} in ${pct(low.score)}`,
      detail:
        `The same questions in the same period, and the difference is more than chance.` +
        (drivers.length > 0
          ? ` It comes mostly from ${drivers.map((row) => `"${row.name}" (${row.hi.own} of ${row.hi.runs} against ${row.lo.own} of ${row.lo.runs})`).join(", ")}.`
          : ""),
      href: "/visibility/assistants",
    });
  }

  // Types one assistant gives the venue and the other never does.
  let splits = 0;
  for (const row of rows) {
    if (splits === 3) break;
    const rateA = row.a.own / row.a.runs;
    const rateB = row.b.own / row.b.runs;
    const only = rateA >= 0.5 && row.b.own === 0 ? a : rateB >= 0.5 && row.a.own === 0 ? b : null;
    if (!only || Math.min(row.a.runs, row.b.runs) < 3) continue;
    const other = only === a ? b : a;
    const mine = only === a ? row.a : row.b;
    const theirs = only === a ? row.b : row.a;
    splits += 1;
    out.push({
      id: `split-${row.name}`,
      area: "assistants",
      tone: "watch",
      weight: 47,
      title: `Only ${only.assistant} names you for "${row.name}"`,
      detail: `${only.assistant}: ${mine.own} of ${mine.runs} answers. ${other.assistant}: 0 of ${theirs.runs}. What ${other.assistant} reads for this type does not mention you yet.`,
      href: "/visibility/assistants",
    });
  }

  // What each one reads.
  const top = (column: number) =>
    [...cmp.sources]
      .filter((s) => s.cells[column] > 0)
      .sort((x, y) => y.cells[column] - x.cells[column])
      .slice(0, 3)
      .map((s) => s.domain);
  const readsA = top(0);
  const readsB = top(1);
  if (readsA.length > 0 && readsB.length > 0) {
    const shared = readsA.filter((domain) => readsB.includes(domain));
    out.push({
      id: "assistants-sources",
      area: "sources",
      tone: "neutral",
      weight: 18,
      title: `${a.assistant} reads ${readsA.join(", ")}; ${b.assistant} reads ${readsB.join(", ")}`,
      detail:
        shared.length > 0
          ? `${shared.join(" and ")} ${shared.length === 1 ? "feeds" : "feed"} both, so a mention there works twice.`
          : `No overlap among their most cited sources: each assistant has to be won on the pages it reads.`,
      href: "/visibility/assistants",
    });
  }
  return out;
}

/** What the site's week says. */
function forTraffic(week: WeekTraffic): Insight[] {
  const out: Insight[] = [];
  if (!week.site || week.error) return out;
  const now = week.current;
  const before = week.previous;
  const span = `${dayLabel(now.from)} to ${dayLabel(now.to)}`;
  const byAssistant = now.byAssistant.map((item) => `${item.label} ${item.value}`).join(", ");

  const visits = countMovement(before.aiVisits, now.aiVisits);
  if (now.aiVisits === 0 && before.aiVisits === 0) {
    out.push({
      id: "ai-visits",
      area: "traffic",
      tone: "neutral",
      weight: 16,
      title: `No visits from AI assistants, ${span}`,
      detail: `None the week before either. Assistants send people when they link the site as a source, so this follows the "own site cited" number.`,
      href: "/traffic",
    });
  } else if (visits === "noise") {
    out.push({
      id: "ai-visits",
      area: "traffic",
      tone: "neutral",
      weight: 22,
      title: `Assistants sent ${plural(now.aiVisits, "visit")}, ${span}; ${before.aiVisits} the week before`,
      detail: `${byAssistant ? `${byAssistant}. ` : ""}At counts this small the difference is ordinary week to week wobble, not a trend.`,
      href: "/traffic",
    });
  } else {
    out.push({
      id: "ai-visits",
      area: "traffic",
      tone: visits === "up" ? "good" : "bad",
      weight: 66,
      title: `Visits from AI assistants ${visits === "up" ? "rose" : "fell"} from ${before.aiVisits} to ${now.aiVisits}`,
      detail: `${span} against the week before${byAssistant ? `: ${byAssistant}` : ""}. More than the usual week to week wobble.`,
      href: "/traffic",
    });
  }

  if (now.aiLanding.length > 0) {
    out.push({
      id: "ai-landing",
      area: "traffic",
      tone: "neutral",
      weight: 13,
      title: `Assistants send people to ${now.aiLanding.slice(0, 2).map((page) => `${page.label} (${page.value})`).join(" and ")}`,
      detail: `The pages they link are the pages they quote. Facts on these pages (menu, hours, address) are what visitors arrive expecting.`,
      href: "/traffic",
    });
  }
  if (now.aiConversions > 0) {
    out.push({
      id: "ai-conversions",
      area: "traffic",
      tone: "good",
      weight: 32,
      title: `${plural(now.aiConversions, "conversion")} by visitors an assistant sent`,
      detail: `Out of ${now.conversions} on the site, ${span}: ${now.aiVisitors} people arrived from an assistant.`,
      href: "/conversions",
    });
  }

  // Crawlers: the ones that feed the assistants, present or gone.
  const hitsNow = new Map(now.bots.map((bot) => [bot.label, bot.value]));
  const hitsBefore = new Map(before.bots.map((bot) => [bot.label, bot.value]));
  const gone = KEY_BOTS.filter(({ bot }) => (hitsBefore.get(bot) ?? 0) > 0 && (hitsNow.get(bot) ?? 0) === 0);
  if (gone.length > 0) {
    out.push({
      id: "crawlers-gone",
      area: "crawlers",
      tone: "watch",
      weight: 29,
      title: `${gone.map((g) => g.bot).join(" and ")} did not fetch the site, ${span}`,
      detail: `${gone.length === 1 ? "It" : "They"} did the week before (${gone.map((g) => `${g.bot} ${hitsBefore.get(g.bot)}`).join(", ")}). ${gone.map((g) => g.assistant).join(" and ")} can only quote pages its crawler has read.`,
      href: "/bots",
    });
  }
  const crawl = countMovement(before.botHits, now.botHits);
  if (now.botHits > 0 || before.botHits > 0) {
    out.push({
      id: "crawlers",
      area: "crawlers",
      tone: crawl === "down" ? "watch" : "neutral",
      weight: crawl === "noise" ? 11 : 21,
      title:
        crawl === "noise"
          ? `AI crawlers fetched the site ${plural(now.botHits, "time")}, about as often as the week before (${before.botHits})`
          : `AI crawler visits ${crawl === "up" ? "rose" : "fell"} from ${before.botHits} to ${now.botHits}`,
      detail: `${now.bots.slice(0, 4).map((bot) => `${bot.label} ${bot.value}`).join(", ") || "None this week"}.${now.botPaths.length > 0 ? ` Most read: ${now.botPaths.slice(0, 2).map((p) => p.label).join(", ")}.` : ""}`,
      href: "/bots",
    });
  }
  return out;
}

/** The name the traffic module files an assistant's visits under. */
const TRAFFIC_NAME: Partial<Record<VisibilityOverview["platforms"][number]["platform"], string[]>> = {
  chatgpt: ["ChatGPT"],
  google_aio: ["Gemini", "Google AI"],
  perplexity: ["Perplexity"],
};

/**
 * Answers and visits, joined per assistant: an assistant sends people to the
 * pages it cites. Citing without visits, or visits without citing, each say
 * something the two modules cannot say alone.
 */
function linkAnswersToVisits(o: VisibilityOverview, week: WeekTraffic, many: boolean): Insight[] {
  const cur = o.current;
  if (!cur || !week.site || week.error) return [];
  const names = TRAFFIC_NAME[cur.platform];
  if (!names) return [];
  const assistant = ASSISTANT_NAME[cur.platform];
  const visits = week.current.byAssistant.filter((item) => names.includes(item.label)).reduce((sum, item) => sum + item.value, 0);
  const cited = o.metrics.citationRate;
  const span = `${dayLabel(week.current.from)} to ${dayLabel(week.current.to)}`;
  const base = { id: `link-${cur.seriesId}`, area: "traffic" as const, href: "/traffic" };
  if (cited > 0 && visits === 0) {
    return [
      {
        ...base,
        tone: "watch",
        weight: 27,
        title: `${assistant} cites your site in ${pct(cited)} of answers and sent no visitors, ${span}`,
        detail: `People read the answer and do not click through. The page it cites should give a reason to: the menu, a booking link, today's hours.`,
      },
    ];
  }
  if (cited === 0 && visits > 0) {
    return [
      {
        ...base,
        tone: "neutral",
        weight: 19,
        title: `${assistant} sent ${plural(visits, "visit")} without citing your site in any measured answer`,
        detail: `Those visitors asked it something the question set does not cover, most likely about you by name. The landing pages show what they were after.`,
      },
    ];
  }
  if (cited > 0 && visits > 0) {
    return [
      {
        ...base,
        tone: "good",
        weight: many ? 26 : 23,
        title: `${assistant} cites your site in ${pct(cited)} of answers and sent ${plural(visits, "visit")}, ${span}`,
        detail: `Citations are where AI traffic comes from: an assistant links the pages it quotes.`,
      },
    ];
  }
  return [];
}

export interface InsightInput {
  /** One overview per assistant of the report, in column order (ChatGPT first). */
  assistants: VisibilityOverview[];
  /** The week of traffic the report reads, for a weekly report. */
  week?: WeekTraffic | null;
}

/** Every finding the report supports, most important first. */
export function insightsFor(input: InsightInput): Insight[] {
  const measured = input.assistants.filter((o) => o.hasData && o.current);
  const many = measured.length > 1;
  const all = [
    ...measured.flatMap((o) => forAssistant(o, many)),
    ...acrossAssistants(measured),
    ...(input.week ? forTraffic(input.week) : []),
    ...(input.week ? measured.flatMap((o) => linkAnswersToVisits(o, input.week!, many)) : []),
  ];
  // A stable sort: findings of equal weight keep the order of the assistants.
  return all.sort((x, y) => y.weight - x.weight);
}

/**
 * The report in two sentences: the most important finding, then the most
 * important one about another assistant or another area. Built from the same
 * list, so the summary can never say something the findings below it do not.
 */
export function verdictOf(insights: Insight[]): { headline: string; also: string | null; tone: InsightTone } | null {
  const lead = insights[0];
  if (!lead) return null;
  // The second sentence is about another assistant when there is one, otherwise about another area.
  const other = (item: Insight) => item !== lead && item.weight >= 30;
  const second =
    insights.find((item) => other(item) && Boolean(item.series) && Boolean(lead.series) && item.series !== lead.series) ??
    insights.find((item) => other(item) && item.area !== lead.area) ??
    null;
  return { headline: `${lead.title}.`, also: second ? `${second.title}.` : null, tone: lead.tone };
}
