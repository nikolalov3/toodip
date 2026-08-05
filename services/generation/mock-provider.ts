import { normalize } from "@/services/classification";
import type {
  GeneratedDraft,
  GenerationContext,
  GenerationProvider,
  GenerationProviderResult,
} from "@/services/generation/types";
import type { KeywordBankItem } from "@/types/domain";

/**
 * Deterministic reply engine.
 *
 * It exists so the whole product works with zero API cost: the pipeline, the
 * approval gate, the quality checks and the UI all run against real output. It
 * follows the same rules the system prompt states, which makes it a decent
 * baseline to compare a model against later.
 *
 * It is not trying to be a language model. It picks the topic the reviewer
 * actually wrote about, builds a reply around that topic in the review's
 * language, and inserts at most one keyword phrase in a frame that stays
 * grammatical in Polish and English.
 */

type Lang = "pl" | "en";

interface Topic {
  key: string;
  patterns: RegExp;
  positive: Record<Lang, string | null>;
  /** Subordinate clause used as: "Przykro nam, ze {clause}." */
  negative: Record<Lang, string>;
}

const TOPICS: Topic[] = [
  {
    key: "coffee",
    patterns:
      /kawa|kawe|kawy|latte|espresso|cappuccino|cortado|flat white|filtrowan|cold brew|coffee|brew/,
    positive: {
      pl: "Cieszymy sie, ze kawa trafila w gust.",
      en: "Glad the coffee held up.",
    },
    negative: {
      pl: "kawa nie byla taka, jaka powinna wyjsc",
      en: "the coffee was not what it should have been",
    },
  },
  {
    key: "food",
    patterns:
      /ciast|sernik|tort|sniadan|brunch|tost|jajk|jedzeni|kanapk|cake|toast|eggs|breakfast|food|avocado/,
    positive: {
      pl: "Wypieki robimy u siebie od rana, wiec dobrze to slyszec.",
      en: "We bake everything here in the morning, so that is good to hear.",
    },
    negative: {
      pl: "jedzenie nie wygladalo tak, jak powinno",
      en: "the food was not what it should have been",
    },
  },
  {
    key: "wait",
    patterns: /czekal|czekan|kolejk|minut|wait|queue|slow|line for/,
    positive: { pl: null, en: null },
    negative: {
      pl: "czekanie trwalo o wiele za dlugo",
      en: "the wait was far longer than it should be",
    },
  },
  {
    key: "service",
    patterns:
      /obslug|barist|kelner|bariste|staff|service|rude|opryskliw|nieuprzejm|polecil/,
    positive: {
      pl: "Milo, ze obsluga zostawila dobre wrazenie.",
      en: "Good to hear the team left the right impression.",
    },
    negative: {
      pl: "obsluga zostawila zupelnie inne wrazenie, niz powinna",
      en: "the service left the wrong impression",
    },
  },
  {
    key: "atmosphere",
    patterns: /muzyk|glosn|halas|klimat|atmosfer|wnetrz|music|loud|atmosphere|cosy|vibe/,
    positive: {
      pl: "Klimat tego miejsca budujemy powoli, wiec dziekujemy za te uwage.",
      en: "We build this room slowly, so thank you for noticing.",
    },
    negative: {
      pl: "halas przeszkodzil wam w rozmowie",
      en: "the noise got in the way of your visit",
    },
  },
  {
    key: "work",
    patterns: /laptop|wifi|gniazdk|pracowa|popracowa|work|sockets|remote|desk/,
    positive: {
      pl: "Stoliki z gniazdkami trzymamy wlasnie na takie poranki.",
      en: "The desks with sockets exist for mornings exactly like that.",
    },
    negative: {
      pl: "warunki do pracy zawiodly",
      en: "the setup for working did not hold up",
    },
  },
  {
    key: "garden",
    patterns: /ogrod|ogrodk|podworz|garden|patio|courtyard/,
    positive: {
      pl: "Ogrod z tylu to nasze ulubione miejsce w calym lokalu.",
      en: "The garden at the back is our favourite part of the place.",
    },
    negative: {
      pl: "ogrod nie byl przygotowany tak, jak powinien",
      en: "the garden was not in the state it should be",
    },
  },
  {
    key: "pet",
    patterns: /\bpies|\bpsem|piesk|\bdog\b|\bdogs\b/,
    positive: {
      pl: "Psy sa u nas stalymi goscmi i tak juz zostanie.",
      en: "Dogs are regulars here and that is not changing.",
    },
    negative: {
      pl: "wizyta z psem wygladala inaczej, niz powinna",
      en: "the visit with your dog did not go the way it should",
    },
  },
  {
    key: "hygiene",
    patterns: /wlos|brud|higien|hair|hygien|dirty|filthy/,
    positive: { pl: null, en: null },
    negative: {
      pl: "to, co znalazlo sie na talerzu, nigdy nie powinno tam trafic",
      en: "what you found on the plate should never have been there",
    },
  },
  {
    key: "money",
    patterns: /zwrot|zaplacil|rachunek|paragon|refund|charged|bill|paid/,
    positive: { pl: null, en: null },
    negative: {
      pl: "zamowienie i platnosc nie zgadzaly sie z tym, co dotarlo do stolika",
      en: "the order and the payment did not match what arrived",
    },
  },
];

const FALLBACK: Record<Lang, { positive: string; negative: string }> = {
  pl: {
    positive: "Dobrze wiedziec, ze wizyta wypadla tak, jak chcielismy.",
    negative: "wizyta nie wygladala tak, jak powinna",
  },
  en: {
    positive: "Good to know the visit landed the way we hope it does.",
    negative: "the visit did not go the way it should have",
  },
};

const INVITES: Record<Lang, string[]> = {
  pl: [
    "Do zobaczenia.",
    "Wpadaj, kiedy bedziesz w okolicy.",
    "Czekamy na kolejna wizyte.",
  ],
  en: ["See you next time.", "Come back any time.", "The door is open."],
};

/** Polish vocative for the common name endings. Skips the name when unsure. */
function polishVocative(firstName: string): string | null {
  if (/[aA]$/.test(firstName)) return `${firstName.slice(0, -1)}o`;
  return null;
}

function firstName(reviewerName: string | null): string | null {
  if (!reviewerName) return null;
  const first = reviewerName.trim().split(/\s+/)[0];
  return first && first.length > 1 ? first : null;
}

function addressee(reviewerName: string | null, lang: Lang): string {
  const name = firstName(reviewerName);
  if (!name) return "";
  if (lang === "en") return `, ${name}`;
  const vocative = polishVocative(name);
  return vocative ? `, ${vocative}` : "";
}

/**
 * When the review is a complaint, the thing that went wrong outranks the thing
 * that was merely mentioned. A one star about a cold latte after a long wait is
 * about the wait, not about coffee.
 */
const PROBLEM_FIRST = [
  "hygiene",
  "money",
  "wait",
  "service",
  "atmosphere",
  "food",
  "coffee",
  "work",
  "garden",
  "pet",
];

/** How many distinct terms of a topic the review actually uses. */
function topicScore(topic: Topic, normalized: string): number {
  const global = new RegExp(topic.patterns.source, "g");
  const matches = normalized.match(global);
  return matches ? new Set(matches).size : 0;
}

/**
 * The topic a review is really about is the one it says most about. A remote
 * work review that mentions a flat white once is about the desk, not the drink.
 */
function detectTopic(text: string, problemFirst = false): Topic | null {
  const normalized = normalize(text);
  const order = problemFirst
    ? PROBLEM_FIRST.map((key) => TOPICS.find((topic) => topic.key === key)!)
    : TOPICS;

  let best: Topic | null = null;
  let bestScore = 0;
  for (const topic of order) {
    const score = topicScore(topic, normalized);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }
  return best;
}

/** Terms that make a keyword phrase a sensible fit for a topic. */
const TOPIC_KEYWORD_HINTS: Record<string, RegExp> = {
  coffee: /kawa|kawy|filtrowan|speciality|espresso|coffee|brew/,
  food: /sernik|ciast|wypiek|sniadan|tort|brunch|bake|cake|breakfast/,
  work: /laptop|spot|work|desk/,
  garden: /ogrod|garden|patio/,
  atmosphere: /kawiarnia|cafe|miejsce/,
};

/**
 * The keyword sentence carries the invitation to return, so adding a phrase
 * never costs the reply an extra sentence.
 */
function keywordSentence(
  keyword: KeywordBankItem | null,
  lang: Lang,
  variant: number,
): string {
  if (!keyword) return "";
  const phrase =
    keyword.phrase.charAt(0).toUpperCase() + keyword.phrase.slice(1);
  if (lang === "pl") {
    return variant % 2 === 0
      ? `${phrase} to u nas codziennosc, wiec wpadaj.`
      : `${phrase} to nasz konik, wiec do zobaczenia.`;
  }
  return variant % 2 === 0
    ? `Come back for ${keyword.phrase} any time.`
    : `${phrase} is what we obsess over, so drop in when you are nearby.`;
}

/**
 * Picks a keyword that fits what the review is about, and among equals the one
 * used least. Relevance first, then rotation, which is what stops a profile
 * from reading like the same phrase pasted under every review.
 */
function pickKeyword(
  context: GenerationContext,
  lang: Lang,
  skip: Set<string>,
  topicKey: string | null,
): KeywordBankItem | null {
  const reviewText = normalize(context.review.reviewText);
  const hint = topicKey ? TOPIC_KEYWORD_HINTS[topicKey] : undefined;

  const candidates = context.keywords
    .filter((item) => item.active)
    .filter((item) => !skip.has(item.id))
    .filter((item) => keywordLanguage(item.phrase) === lang)
    .filter((item) => !reviewText.includes(normalize(item.phrase)));

  const relevant = hint
    ? candidates.filter((item) => hint.test(normalize(item.phrase)))
    : [];

  const pool = relevant.length ? relevant : candidates;
  return [...pool].sort((a, b) => a.usageCount - b.usageCount)[0] ?? null;
}

function keywordLanguage(phrase: string): Lang {
  return /[ąćęłńóśźż]/i.test(phrase) ||
    /\b(kawa|kawiarnia|sniadania|sernik|ogrod|palarnia|przy|na|w)\b/i.test(phrase)
    ? "pl"
    : "en";
}

interface Composed {
  text: string;
  rationale: string;
}

function composePositive(
  context: GenerationContext,
  lang: Lang,
  variant: number,
  keyword: KeywordBankItem | null,
): Composed {
  const topic = detectTopic(context.review.reviewText);
  const echo = topic?.positive[lang] ?? FALLBACK[lang].positive;
  const name = addressee(context.review.reviewerName, lang);
  const invite = INVITES[lang][variant % INVITES[lang].length];
  const kw = keywordSentence(keyword, lang, variant);

  const opener =
    lang === "pl"
      ? [`Dziekujemy${name}.`, `Dzieki za te slowa${name}.`, `Milo nam to czytac${name}.`][
          variant % 3
        ]
      : [`Thank you${name}.`, `Thanks${name}, this made our morning.`, `Appreciate this${name}.`][
          variant % 3
        ];

  return {
    // The keyword sentence already invites, so it replaces the closing line.
    text: [opener, echo, kw || invite].filter(Boolean).join(" "),
    rationale: `Positive path. Echoes the ${topic?.key ?? "overall"} detail, ${
      keyword ? `one keyword phrase (${keyword.phrase})` : "no keyword"
    }, soft invitation to return.`,
  };
}

function composeMixed(
  context: GenerationContext,
  lang: Lang,
  variant: number,
  keyword: KeywordBankItem | null,
): Composed {
  const topic = detectTopic(context.review.reviewText, true);
  const shortfall = topic?.negative[lang] ?? FALLBACK[lang].negative;
  const name = addressee(context.review.reviewerName, lang);
  const kw = keywordSentence(keyword, lang, variant);

  if (lang === "pl") {
    const opener = [
      `Dziekujemy za szczera opinie${name}.`,
      `Dzieki, ze o tym piszecie${name}.`,
    ][variant % 2];
    const acknowledgement = [
      `To, ze ${shortfall}, bierzemy na powaznie i sprawdzimy to u siebie.`,
      `To, ze ${shortfall}, jest po naszej stronie i juz sie tym zajmujemy.`,
    ][variant % 2];
    return {
      text: [opener, acknowledgement, kw || "Zapraszamy ponownie."]
        .filter(Boolean)
        .join(" "),
      rationale: `Mixed path. Names the shortfall in the reviewer's own topic (${
        topic?.key ?? "general"
      }), states intent to fix, invites without pleading.`,
    };
  }

  const opener = [
    `Thank you for the honest review${name}.`,
    `Thanks for writing this${name}.`,
  ][variant % 2];
  const acknowledgement = [
    `The fact that ${shortfall} is on us, and we are looking at it this week.`,
    `That ${shortfall} is not the visit we want to give anyone, and we are fixing it.`,
  ][variant % 2];
  return {
    text: [
      opener,
      acknowledgement,
      kw || "We would like the chance to do better.",
    ]
      .filter(Boolean)
      .join(" "),
    rationale: `Mixed path. Names the shortfall in the reviewer's own topic (${
      topic?.key ?? "general"
    }), states intent to fix, invites without pleading.`,
  };
}

function composeNegative(
  context: GenerationContext,
  lang: Lang,
  variant: number,
): Composed {
  const topic = detectTopic(context.review.reviewText, true);
  const problem = topic?.negative[lang] ?? FALLBACK[lang].negative;
  const name = addressee(context.review.reviewerName, lang);
  const { escalationEmail, escalationPhone } = context.profile;
  const contact = [escalationEmail, escalationPhone]
    .filter(Boolean)
    .join(lang === "pl" ? " albo " : " or ");

  const rationale = `Negative path. One apology, the problem named in the reviewer's own terms, no excuse, straight to a private channel. Topic: ${
    topic?.key ?? "general"
  }.`;

  if (lang === "pl") {
    if (variant % 2 === 0) {
      const apology = `Przykro nam${name}, ze ${problem}.`;
      const offline = contact
        ? `Chcemy to wyjasnic bezposrednio, prosimy o kontakt: ${contact}.`
        : "Chcemy to wyjasnic bezposrednio, prosimy o wiadomosc do nas.";
      return {
        text: [apology, offline, "Odezwiemy sie tego samego dnia."].join(" "),
        rationale,
      };
    }
    const apology = `Bardzo nam przykro, ze ${problem}.`;
    const offline = contact
      ? `Tego nie zostawiamy tak, napiszcie do nas na ${contact}, a zajmiemy sie sprawa osobiscie.`
      : "Tego nie zostawiamy tak, prosimy o wiadomosc, zajmiemy sie sprawa osobiscie.";
    return { text: [apology, offline].join(" "), rationale };
  }

  if (variant % 2 === 0) {
    const apology = `We are sorry${name}, ${problem}.`;
    const offline = contact
      ? `We would like to sort this out directly, please write to ${contact}.`
      : "We would like to sort this out directly, please get in touch with us.";
    return {
      text: [apology, offline, "We will come back to you the same day."].join(" "),
      rationale,
    };
  }

  const apology = `We are sorry that ${problem}.`;
  const offline = contact
    ? `That is not something we leave alone, write to ${contact} and we will take it from there personally.`
    : "That is not something we leave alone, get in touch and we will take it from there personally.";
  return { text: [apology, offline].join(" "), rationale };
}

function withSignOff(text: string, signOff: string, useIt: boolean): string {
  if (!useIt || !signOff.trim()) return text;
  return `${text}\n\n${signOff}`;
}

export const mockGenerationProvider: GenerationProvider = {
  id: "mock-reply-v1",
  label: "Local rule engine",
  offline: true,

  async generate(_prompt, context): Promise<GenerationProviderResult> {
    const startedAt = Date.now();
    const lang: Lang = context.review.language === "en" ? "en" : "pl";
    const stars = context.review.stars;
    const usedKeywordIds = new Set<string>();
    const drafts: GeneratedDraft[] = [];

    // Keeps a regeneration from repeating what the operator already rejected.
    const seen = new Set(context.previousDrafts.map((text) => normalize(text)));

    for (let index = 0; index < context.draftCount; index += 1) {
      const variant = index + context.previousDrafts.length;
      const negative = stars <= 2;
      const topicKey = negative
        ? null
        : (detectTopic(context.review.reviewText)?.key ?? null);
      const keyword = negative
        ? null
        : pickKeyword(context, lang, usedKeywordIds, topicKey);
      if (keyword) usedKeywordIds.add(keyword.id);

      const composed = negative
        ? composeNegative(context, lang, variant)
        : stars === 3 || context.review.sentiment === "mixed"
          ? composeMixed(context, lang, variant, index === 0 ? keyword : null)
          : composePositive(context, lang, variant, index === 0 ? keyword : null);

      if (seen.has(normalize(composed.text))) continue;
      seen.add(normalize(composed.text));

      drafts.push({
        // Serious complaints get signed. Short positive replies do not need it.
        text: withSignOff(composed.text, context.profile.signOff, negative),
        rationale: composed.rationale,
        keywordUsed: index === 0 && keyword ? keyword.phrase : null,
      });
    }

    // A regeneration that produced nothing new still has to return something.
    if (drafts.length === 0) {
      const composed = composePositive(context, lang, Date.now() % 3, null);
      drafts.push({ ...composed, keywordUsed: null });
    }

    return {
      model: "mock-reply-v1",
      drafts,
      usage: { promptTokens: null, completionTokens: null },
      latencyMs: Date.now() - startedAt,
    };
  },
};
