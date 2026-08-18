/**
 * Copy for the public marketing pages in six languages.
 *
 * Locales are path-based (/pl, /de, /uk, /fr, /it; the root is English) with
 * hreflang alternates, because AI answer engines and classic crawlers index
 * one URL in one language. Detecting from headers and swapping copy in place
 * would leave five languages invisible to every index.
 *
 * The panel itself stays English for now; this file covers landing + pricing.
 */

export type MarketingLocale = "en" | "pl" | "de" | "uk" | "fr" | "it";

export const MARKETING_LOCALES: MarketingLocale[] = [
  "en",
  "pl",
  "de",
  "uk",
  "fr",
  "it",
];

export const LOCALE_LABELS: Record<MarketingLocale, string> = {
  en: "English",
  pl: "Polski",
  de: "Deutsch",
  uk: "Українська",
  fr: "Français",
  it: "Italiano",
};

/** Path prefix for a locale: "" for English, "/pl" for Polish, etc. */
export function localePrefix(locale: MarketingLocale): string {
  return locale === "en" ? "" : `/${locale}`;
}

/** Tiny template helper: fill("a {x}", {x: "b"}) -> "a b". */
export function fill(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export interface PlanCopy {
  blurb: string;
  features: string[];
}

export interface MarketingDict {
  nav: { pricing: string; signIn: string; startFree: string };
  /** Evidence Atelier landing. Structure mirrors the approved design file. */
  landing: {
    navVisibility: string;
    kicker: string;
    hero: { pre: string; em: string; post: string };
    lead: string;
    ctaMeasure: string;
    ctaReply: string;
    proof: Array<{ value: string; label: string }>;
    marquee: string[];
    card: {
      label: string;
      live: string;
      question: string;
      rows: string[];
      foot: string;
      delta: string;
    };
    vis: {
      eyebrow: string;
      title: { pre: string; blue: string };
      body: string;
      shareLabel: string;
      shareRows: string[];
      shareNote: string;
      srcLabel: string;
      srcRows: Array<{ name: string; verdict: string }>;
      srcNote: string;
      logEyebrow: string;
      logTitle: { pre: string; em: string };
      logKeys: string[];
    };
    reply: {
      eyebrow: string;
      stamp: string;
      lead: string;
      benefits: string[];
      cta: string;
      deskLabel: string;
      quote: string;
      response: string;
      tags: string[];
      approval: string;
      copyAria: string;
    };
    source: {
      eyebrow: string;
      title: { pre: string; blue: string };
      body: string;
      cta: string;
      caption: string;
    };
    pricing: {
      eyebrow: string;
      title: { pre: string; blue: string };
      body: string;
      groupA: { title: string; note: string; cta: string };
      groupB: { title: string; note: string; cta: string };
      mostPopular: string;
      footnote: string;
    };
    faq: { eyebrow: string; title: { pre: string; blue: string } };
    footer: { tagline: string; cta: string };
  };
  contact: {
    title: string;
    body: string;
    formName: string;
    formMessage: string;
    submit: string;
    direct: string;
  };
  footer: { product: string };
  pricing: {
    title: string;
    intro: string;
    replyTitle: string;
    replyIntro: string;
    visTitle: string;
    visIntro: string;
    proNote: string;
    faqTitle: string;
    faq: Array<{ q: string; a: string }>;
    perMonth: string;
    free: string;
    startFree: string;
    startUpgrade: string;
    trialBadge: string;
  };
  plans: Record<
    "free" | "starter" | "pro" | "visibility" | "unlimited",
    PlanCopy
  >;
}

const en: MarketingDict = {
  nav: { pricing: "Pricing", signIn: "Sign in", startFree: "Start free" },
  landing: {
    navVisibility: "AI visibility",
    kicker: "A European visibility system for local brands",
    hero: {
      pre: "When a guest asks AI, ",
      em: "your venue",
      post: " should have something to say.",
    },
    lead: "toodip shows how your brand appears in AI answers — and helps you build a more useful trace in every conversation that matters to a customer.",
    ctaMeasure: "Measure your visibility",
    ctaReply: "Go to the review desk",
    proof: [
      { value: "3", label: "AI answer sources\nin one view" },
      { value: "1", label: "consistent way\nof handling reviews" },
    ],
    marquee: [
      "Google AI Overviews",
      "ChatGPT",
      "Perplexity",
      "Google reviews",
      "Your brand",
    ],
    card: {
      label: "VISIBILITY MEASUREMENT",
      live: "current",
      question: "Does your venue show up when the choice is being made?",
      rows: ["Local recommendations", "Review replies", "Own sources"],
      foot: "NEW SIGNAL",
      delta: "+ 14 pts",
    },
    vis: {
      eyebrow: "VISIBILITY YOU CAN SEE",
      title: {
        pre: "Don't guess whether AI knows your venue. ",
        blue: "See the trace.",
      },
      body: "toodip organises the questions, answers and sources that shape how AI describes your brand. You learn where to build presence — without the marketing noise.",
      shareLabel: "SHARE OF RECOMMENDATIONS",
      shareRows: ["Other venues", "Competitors", "Your venue"],
      shareNote: "Not a report for the report's sake. A direction for the next decision.",
      srcLabel: "SOURCE STRENGTH",
      srcRows: [
        { name: "own website", verdict: "strong signal" },
        { name: "local guides", verdict: "present" },
        { name: "social & reviews", verdict: "to strengthen" },
      ],
      srcNote: "The sources AI systems cite more often than others.",
      logEyebrow: "CHANGE LOG",
      logTitle: { pre: "Small actions.", em: "A visible difference." },
      logKeys: ["replies", "sources", "measurement"],
    },
    reply: {
      eyebrow: "NEW IN TOODIP",
      stamp: "MODULE / 01",
      lead: "Replying to reviews doesn't have to be another chore. Reply Assistant helps you write them in your brand's voice — with tact, consistency and the context that matters.",
      benefits: [
        "Brand voice kept in every reply",
        "Key signals and topics picked up naturally",
        "The final decision always stays with you",
      ],
      cta: "Try it on your reviews",
      deskLabel: "CUSTOMER REVIEW",
      quote:
        "“Great coffee, calm and comfortable — I'll be back next time I work in this part of town.”",
      response:
        "Thank you for such a specific review. We're glad the coffee and the calm space helped you make the most of your time. See you on your next working day.",
      tags: ["consistent tone", "ready to approve"],
      approval: "requires approval",
      copyAria: "Copy reply",
    },
    source: {
      eyebrow: "FROM A REPLY TO A BRAND PICTURE",
      title: { pre: "A better reply is ", blue: "more than a reaction." },
      body: "It is a small but repeatable signal: about your standard of service, the character of the place, and what's worth remembering. toodip helps assemble those signals into a coherent brand presence.",
      cta: "See the measurement plans",
      caption: "SOURCES / CONTEXT / PRESENCE",
    },
    pricing: {
      eyebrow: "PRICING",
      title: { pre: "Two product lines.", blue: "One panel." },
      body: "Pick where you start. Every plan can be changed later, straight from the billing panel.",
      groupA: {
        title: "Reply Assistant",
        note: "Review replies that work towards a coherent picture of the venue.",
        cta: "Start with reviews",
      },
      groupB: {
        title: "AI visibility",
        note: "Measure your brand's presence in the answers your guests ask for.",
        cta: "Start measuring",
      },
      mostPopular: "Most popular choice",
      footnote:
        "Monthly prices in EUR. VAT invoices at checkout. Cancel any time from the billing panel.",
    },
    faq: { eyebrow: "SHORT AND CONCRETE", title: { pre: "Common", blue: "questions." } },
    footer: {
      tagline: "Local brand visibility\nin the age of AI answers.",
      cta: "Start measuring",
    },
  },
  contact: {
    title: "Contact",
    body: "Questions, agency plans, or a venue that wants the measurement and the fixing done for it. We read everything at {email}.",
    formName: "Your name or venue",
    formMessage: "What can we help with?",
    submit: "Open in your mail app",
    direct: "Or write directly:",
  },
  footer: { product: "A NotASlop product" },
  pricing: {
    title: "Pricing",
    intro:
      "Two product lines, one panel. Monthly subscriptions billed in EUR, VAT invoices at checkout, cancellation from the billing portal. Every account starts free, with no card.",
    replyTitle: "Review reply desk",
    replyIntro:
      "Paste a Google review, get a reply in the venue's voice, approve, publish. The plan decides how many replies a month and whether the AI model writes them.",
    visTitle: "AI visibility measurement",
    visIntro:
      "The full analysis panel: measurement batteries against ChatGPT, Google AI Overviews and Perplexity, share of voice, source maps, score trends and the intervention log. Includes everything in the reply desk.",
    proNote:
      "The Pro reply plan includes the visibility dashboard read only: imported baselines and past measurements, without running new ones.",
    faqTitle: "Common questions",
    faq: [
      {
        q: "Do I get a VAT invoice?",
        a: "Yes. Checkout collects your billing address and VAT ID, and every invoice carries them. Invoices download from the billing portal in the panel.",
      },
      {
        q: "What counts as one reply?",
        a: "One review that had a reply generated this calendar month. Drafts, retries and regenerations of the same review are included in that one unit.",
      },
      {
        q: "What counts as one measurement?",
        a: "One question asked once against one AI platform, with the full answer, mentions and cited sources stored. A weekly battery of 25 questions is about 100 measurements a month per platform.",
      },
      {
        q: "Can I cancel any time?",
        a: "Yes, from the billing portal, effective at the end of the paid period. No emails, no phone calls.",
      },
      {
        q: "Running several venues?",
        a: "That is the agency plan, priced per portfolio. Write to {email}.",
      },
    ],
    perMonth: "/ mo",
    free: "0 €",
    startFree: "Start free",
    startUpgrade: "Start free, upgrade inside",
    trialBadge: "{n} days free",
  },
  plans: {
    free: {
      blurb: "Try the workflow on your own reviews.",
      features: [
        "3 replies a month",
        "Draft engine, no AI model",
        "Classification and risk flags",
        "Brand voice settings",
      ],
    },
    starter: {
      blurb: "For a venue answering a steady trickle of reviews.",
      features: [
        "15 AI replies a month",
        "Replies written by the AI model",
        "Approval workflow and audit trail",
        "Everything in Free",
      ],
    },
    pro: {
      blurb: "For a busy venue or one that cares about every reply.",
      features: [
        "Unlimited AI replies, fair use",
        "Visibility dashboard, read only",
        "Everything in Starter",
      ],
    },
    visibility: {
      blurb: "Know whether AI recommends you, and fix why not.",
      features: [
        "150 AI visibility measurements a month",
        "Score trend, source map, intervention log",
        "Everything in Pro",
      ],
    },
    unlimited: {
      blurb: "For venues and agencies that monitor weekly.",
      features: [
        "1000 measurements a month, fair use",
        "Room for weekly batteries per platform",
        "Priority support",
        "Everything in Visibility",
      ],
    },
  },
};

const pl: MarketingDict = {
  nav: { pricing: "Cennik", signIn: "Zaloguj się", startFree: "Zacznij za darmo" },
  landing: {
    navVisibility: "Widoczność AI",
    kicker: "Europejski system widoczności dla lokalnych marek",
    hero: {
      pre: "Gdy gość pyta AI, ",
      em: "Twoje miejsce",
      post: " powinno mieć coś do powiedzenia.",
    },
    lead: "Toodip pokazuje, jak Twoja marka jest widziana w odpowiedziach AI — i pomaga budować bardziej użyteczny ślad w każdej ważnej rozmowie z klientem.",
    ctaMeasure: "Zmierz swoją widoczność",
    ctaReply: "Przejdź do zapisu opinii",
    proof: [
      { value: "3", label: "źródła odpowiedzi AI\nw jednym widoku" },
      { value: "1", label: "spójny sposób pracy\nz opiniami" },
    ],
    marquee: [
      "Google AI Overviews",
      "ChatGPT",
      "Perplexity",
      "Opinie Google",
      "Twoja marka",
    ],
    card: {
      label: "POMIAR WIDOCZNOŚCI",
      live: "aktualne",
      question: "Czy Twoje miejsce pojawia się, gdy liczy się wybór?",
      rows: ["Rekomendacje lokalne", "Odpowiedzi na opinie", "Własne źródła"],
      foot: "NOWY SYGNAŁ",
      delta: "+ 14 pkt",
    },
    vis: {
      eyebrow: "WIDOCZNOŚĆ, KTÓRĄ MOŻNA ZOBACZYĆ",
      title: {
        pre: "Nie zgaduj, czy AI zna Twoje miejsce. ",
        blue: "Zobacz ślad.",
      },
      body: "Toodip porządkuje pytania, odpowiedzi i źródła, które współtworzą obraz Twojej marki. Dzięki temu wiesz, gdzie budować obecność — bez marketingowego szumu.",
      shareLabel: "UDZIAŁ W REKOMENDACJACH",
      shareRows: ["Inne miejsca", "Konkurencja", "Twoje miejsce"],
      shareNote: "Nie raport dla raportu. Kierunek do następnej decyzji.",
      srcLabel: "SIŁA ŹRÓDEŁ",
      srcRows: [
        { name: "własna strona", verdict: "mocny sygnał" },
        { name: "lokalne przewodniki", verdict: "obecny" },
        { name: "social i opinie", verdict: "do wzmocnienia" },
      ],
      srcNote: "Źródła, które systemy AI przywołują częściej niż inne.",
      logEyebrow: "DZIENNIK ZMIAN",
      logTitle: { pre: "Małe działania.", em: "Widoczna różnica." },
      logKeys: ["odpowiedzi", "źródła", "pomiar"],
    },
    reply: {
      eyebrow: "NOWOŚĆ W TOODIP",
      stamp: "MODUŁ / 01",
      lead: "Twoje odpowiedzi na opinie nie muszą być kolejnym zadaniem do odhaczenia. Reply Assistant pomaga pisać je w tonie marki — z wyczuciem, spójnością i potrzebnym kontekstem.",
      benefits: [
        "Głos marki zachowany w każdej odpowiedzi",
        "Istotne sygnały i tematy uchwycone naturalnie",
        "Ostateczna decyzja zawsze pozostaje po Twojej stronie",
      ],
      cta: "Otwórz próbny zapis opinii",
      deskLabel: "OPINIA KLIENTA",
      quote:
        "„Świetna kawa, spokojnie i wygodnie — wrócę, gdy znów będę pracować w tej części miasta.”",
      response:
        "Dziękujemy za tak konkretną opinię. Cieszymy się, że kawa i spokojna przestrzeń pomogły Ci dobrze wykorzystać czas. Do zobaczenia przy następnym dniu pracy.",
      tags: ["spójny ton", "gotowe do akceptacji"],
      approval: "wymaga akceptacji",
      copyAria: "Kopiuj odpowiedź",
    },
    source: {
      eyebrow: "OD ODPOWIEDZI DO OBRAZU MARKI",
      title: { pre: "Lepsza odpowiedź to ", blue: "więcej niż reakcja." },
      body: "Jest drobnym, ale powtarzalnym sygnałem: o standardzie obsługi, charakterze miejsca i tym, co warto zapamiętać. Toodip pomaga składać te sygnały w spójną obecność marki.",
      cta: "Zobacz warianty pomiaru",
      caption: "ŹRÓDŁA / KONTEKST / OBECNOŚĆ",
    },
    pricing: {
      eyebrow: "CENNIK",
      title: { pre: "Dwie linie produktu.", blue: "Jeden panel." },
      body: "Wybierz, od czego zaczynasz. Każdy plan można później zmienić prosto z panelu rozliczeń.",
      groupA: {
        title: "Reply Assistant",
        note: "Odpowiedzi na opinie, które pracują na spójny obraz miejsca.",
        cta: "Zacznij od opinii",
      },
      groupB: {
        title: "AI visibility",
        note: "Pomiar obecności marki w odpowiedziach, których szukają Twoi goście.",
        cta: "Rozpocznij pomiar",
      },
      mostPopular: "Najczęstszy wybór",
      footnote:
        "Ceny miesięczne w EUR. Faktura VAT przy płatności. Możesz anulować w dowolnym momencie z poziomu panelu rozliczeń.",
    },
    faq: {
      eyebrow: "KRÓTKO I KONKRETNIE",
      title: { pre: "Najczęstsze", blue: "pytania." },
    },
    footer: {
      tagline: "Widoczność lokalnej marki\nw epoce odpowiedzi AI.",
      cta: "Rozpocznij pomiar",
    },
  },
  contact: {
    title: "Kontakt",
    body: "Pytania, plany agencyjne albo lokal, który chce mieć pomiar i poprawki zrobione za siebie. Czytamy wszystko na {email}.",
    formName: "Twoje imię lub lokal",
    formMessage: "W czym możemy pomóc?",
    submit: "Otwórz w programie pocztowym",
    direct: "Albo napisz bezpośrednio:",
  },
  footer: { product: "Produkt NotASlop" },
  pricing: {
    title: "Cennik",
    intro:
      "Dwie linie produktowe, jeden panel. Subskrypcje miesięczne w EUR, faktury VAT przy płatności, anulowanie w portalu rozliczeń. Każde konto zaczyna za darmo, bez karty.",
    replyTitle: "Biurko odpowiedzi na opinie",
    replyIntro:
      "Wklej opinię z Google, dostań odpowiedź w głosie lokalu, zatwierdź, opublikuj. Plan decyduje, ile odpowiedzi miesięcznie i czy pisze je model AI.",
    visTitle: "Pomiar widoczności w AI",
    visIntro:
      "Pełny panel analityczny: baterie pomiarowe na ChatGPT, Google AI Overviews i Perplexity, udział w odpowiedziach, mapy źródeł, trend wyniku i dziennik interwencji. Zawiera wszystko z biurka odpowiedzi.",
    proNote:
      "Plan Pro zawiera panel widoczności tylko do odczytu: zaimportowane punkty odniesienia i przeszłe pomiary, bez uruchamiania nowych.",
    faqTitle: "Częste pytania",
    faq: [
      {
        q: "Dostanę fakturę VAT?",
        a: "Tak. Przy płatności zbieramy adres rozliczeniowy i NIP, a każda faktura je zawiera. Faktury pobierasz z portalu rozliczeń w panelu.",
      },
      {
        q: "Co liczy się jako jedna odpowiedź?",
        a: "Jedna opinia, dla której wygenerowano odpowiedź w danym miesiącu kalendarzowym. Szkice, poprawki i ponowne generowania tej samej opinii wliczają się w tę jedną jednostkę.",
      },
      {
        q: "Co liczy się jako jeden pomiar?",
        a: "Jedno pytanie zadane raz jednej platformie AI, z zapisaną pełną odpowiedzią, wzmiankami i cytowanymi źródłami. Cotygodniowa bateria 25 pytań to około 100 pomiarów miesięcznie na platformę.",
      },
      {
        q: "Mogę anulować w każdej chwili?",
        a: "Tak, w portalu rozliczeń, ze skutkiem na koniec opłaconego okresu. Bez maili i telefonów.",
      },
      {
        q: "Prowadzisz kilka lokali?",
        a: "To plan agencyjny, wyceniany za portfel lokali. Napisz na {email}.",
      },
    ],
    perMonth: "/ mies.",
    free: "0 €",
    startFree: "Zacznij za darmo",
    startUpgrade: "Zacznij za darmo, ulepsz w panelu",
    trialBadge: "{n} dni za darmo",
  },
  plans: {
    free: {
      blurb: "Wypróbuj na własnych opiniach.",
      features: [
        "3 odpowiedzi miesięcznie",
        "Silnik szkiców, bez modelu AI",
        "Klasyfikacja i flagi ryzyka",
        "Ustawienia głosu marki",
      ],
    },
    starter: {
      blurb: "Dla lokalu z regularnym strumieniem opinii.",
      features: [
        "15 odpowiedzi AI miesięcznie",
        "Odpowiedzi pisze model AI",
        "Zatwierdzanie i pełny dziennik zdarzeń",
        "Wszystko z planu Free",
      ],
    },
    pro: {
      blurb: "Dla ruchliwego lokalu, któremu zależy na każdej odpowiedzi.",
      features: [
        "Odpowiedzi AI bez limitu, fair use",
        "Panel widoczności tylko do odczytu",
        "Wszystko z planu Starter",
      ],
    },
    visibility: {
      blurb: "Wiedz, czy AI Cię poleca, i napraw dlaczego nie.",
      features: [
        "150 pomiarów widoczności miesięcznie",
        "Trend wyniku, mapa źródeł, dziennik interwencji",
        "Wszystko z planu Pro",
      ],
    },
    unlimited: {
      blurb: "Dla lokali i agencji mierzących co tydzień.",
      features: [
        "1000 pomiarów miesięcznie, fair use",
        "Miejsce na cotygodniowe baterie per platforma",
        "Priorytetowe wsparcie",
        "Wszystko z planu Visibility",
      ],
    },
  },
};

const de: MarketingDict = {
  nav: { pricing: "Preise", signIn: "Anmelden", startFree: "Kostenlos starten" },
  landing: {
    navVisibility: "KI-Sichtbarkeit",
    kicker: "Ein europäisches Sichtbarkeitssystem für lokale Marken",
    hero: {
      pre: "Wenn ein Gast die KI fragt, sollte ",
      em: "dein Lokal",
      post: " etwas zu sagen haben.",
    },
    lead: "toodip zeigt, wie deine Marke in KI-Antworten gesehen wird — und hilft dir, in jedem wichtigen Kundengespräch eine nützlichere Spur aufzubauen.",
    ctaMeasure: "Miss deine Sichtbarkeit",
    ctaReply: "Zum Bewertungs-Desk",
    proof: [
      { value: "3", label: "KI-Antwortquellen\nin einer Ansicht" },
      { value: "1", label: "einheitlicher Umgang\nmit Bewertungen" },
    ],
    marquee: [
      "Google AI Overviews",
      "ChatGPT",
      "Perplexity",
      "Google-Bewertungen",
      "Deine Marke",
    ],
    card: {
      label: "SICHTBARKEITSMESSUNG",
      live: "aktuell",
      question: "Taucht dein Lokal auf, wenn die Wahl fällt?",
      rows: ["Lokale Empfehlungen", "Antworten auf Bewertungen", "Eigene Quellen"],
      foot: "NEUES SIGNAL",
      delta: "+ 14 Pkt.",
    },
    vis: {
      eyebrow: "SICHTBARKEIT ZUM ANSEHEN",
      title: {
        pre: "Rate nicht, ob die KI dein Lokal kennt. ",
        blue: "Sieh die Spur.",
      },
      body: "toodip ordnet die Fragen, Antworten und Quellen, die das Bild deiner Marke prägen. So weißt du, wo du Präsenz aufbauen solltest — ohne Marketinglärm.",
      shareLabel: "ANTEIL AN EMPFEHLUNGEN",
      shareRows: ["Andere Orte", "Wettbewerber", "Dein Lokal"],
      shareNote: "Kein Bericht um des Berichts willen. Eine Richtung für die nächste Entscheidung.",
      srcLabel: "QUELLENSTÄRKE",
      srcRows: [
        { name: "eigene Website", verdict: "starkes Signal" },
        { name: "lokale Guides", verdict: "vorhanden" },
        { name: "Social & Bewertungen", verdict: "auszubauen" },
      ],
      srcNote: "Die Quellen, die KI-Systeme häufiger zitieren als andere.",
      logEyebrow: "ÄNDERUNGSPROTOKOLL",
      logTitle: { pre: "Kleine Schritte.", em: "Sichtbarer Unterschied." },
      logKeys: ["Antworten", "Quellen", "Messung"],
    },
    reply: {
      eyebrow: "NEU IN TOODIP",
      stamp: "MODUL / 01",
      lead: "Antworten auf Bewertungen müssen keine lästige Pflicht sein. Der Reply Assistant hilft dir, sie im Ton deiner Marke zu schreiben — mit Feingefühl, Konsistenz und dem nötigen Kontext.",
      benefits: [
        "Markenstimme in jeder Antwort gewahrt",
        "Wichtige Signale und Themen natürlich aufgegriffen",
        "Die letzte Entscheidung bleibt immer bei dir",
      ],
      cta: "Bewertungs-Desk testen",
      deskLabel: "KUNDENBEWERTUNG",
      quote:
        "„Toller Kaffee, ruhig und bequem — ich komme wieder, wenn ich das nächste Mal in dieser Gegend arbeite.“",
      response:
        "Danke für diese konkrete Bewertung. Es freut uns, dass Kaffee und die ruhige Atmosphäre dir geholfen haben, deine Zeit gut zu nutzen. Bis zum nächsten Arbeitstag bei uns.",
      tags: ["einheitlicher Ton", "bereit zur Freigabe"],
      approval: "Freigabe erforderlich",
      copyAria: "Antwort kopieren",
    },
    source: {
      eyebrow: "VON DER ANTWORT ZUM MARKENBILD",
      title: { pre: "Eine bessere Antwort ist ", blue: "mehr als eine Reaktion." },
      body: "Sie ist ein kleines, aber wiederholbares Signal: über deinen Servicestandard, den Charakter des Ortes und das, was man sich merken sollte. toodip fügt diese Signale zu einer stimmigen Markenpräsenz zusammen.",
      cta: "Messvarianten ansehen",
      caption: "QUELLEN / KONTEXT / PRÄSENZ",
    },
    pricing: {
      eyebrow: "PREISE",
      title: { pre: "Zwei Produktlinien.", blue: "Ein Panel." },
      body: "Wähle, womit du startest. Jeder Plan lässt sich später direkt im Abrechnungsbereich wechseln.",
      groupA: {
        title: "Reply Assistant",
        note: "Antworten auf Bewertungen, die auf ein stimmiges Bild des Lokals einzahlen.",
        cta: "Mit Bewertungen starten",
      },
      groupB: {
        title: "AI visibility",
        note: "Miss die Präsenz deiner Marke in den Antworten, nach denen deine Gäste fragen.",
        cta: "Messung starten",
      },
      mostPopular: "Beliebteste Wahl",
      footnote:
        "Monatspreise in EUR. Rechnung mit ausgewiesener USt. beim Checkout. Jederzeit im Abrechnungsbereich kündbar.",
    },
    faq: { eyebrow: "KURZ UND KONKRET", title: { pre: "Häufige", blue: "Fragen." } },
    footer: {
      tagline: "Sichtbarkeit lokaler Marken\nim Zeitalter der KI-Antworten.",
      cta: "Messung starten",
    },
  },
  contact: {
    title: "Kontakt",
    body: "Fragen, Agenturpläne oder ein Lokal, das Messung und Umsetzung erledigt haben möchte. Wir lesen alles unter {email}.",
    formName: "Ihr Name oder Lokal",
    formMessage: "Womit können wir helfen?",
    submit: "Im Mailprogramm öffnen",
    direct: "Oder direkt schreiben:",
  },
  footer: { product: "Ein Produkt von NotASlop" },
  pricing: {
    title: "Preise",
    intro:
      "Zwei Produktlinien, ein Panel. Monatsabos in EUR, Rechnungen mit USt. beim Checkout, Kündigung im Abrechnungsportal. Jedes Konto startet kostenlos, ohne Karte.",
    replyTitle: "Antwort-Schreibtisch für Bewertungen",
    replyIntro:
      "Google-Bewertung einfügen, Antwort in der Stimme des Lokals erhalten, freigeben, veröffentlichen. Der Plan bestimmt, wie viele Antworten pro Monat und ob das KI-Modell sie schreibt.",
    visTitle: "KI-Sichtbarkeitsmessung",
    visIntro:
      "Das volle Analyse-Panel: Messbatterien gegen ChatGPT, Google AI Overviews und Perplexity, Share of Voice, Quellenkarten, Trend und Interventionsprotokoll. Enthält alles aus dem Antwort-Schreibtisch.",
    proNote:
      "Der Pro-Plan enthält das Sichtbarkeits-Dashboard nur lesend: importierte Basislinien und vergangene Messungen, ohne neue zu starten.",
    faqTitle: "Häufige Fragen",
    faq: [
      {
        q: "Bekomme ich eine Rechnung mit USt.?",
        a: "Ja. Der Checkout erfasst Rechnungsadresse und USt-IdNr., jede Rechnung trägt beides. Rechnungen laden Sie im Abrechnungsportal herunter.",
      },
      {
        q: "Was zählt als eine Antwort?",
        a: "Eine Bewertung, für die in diesem Kalendermonat eine Antwort generiert wurde. Entwürfe und Neugenerierungen derselben Bewertung sind in dieser Einheit enthalten.",
      },
      {
        q: "Was zählt als eine Messung?",
        a: "Eine Frage, einmal an eine KI-Plattform gestellt, mit gespeicherter Antwort, Erwähnungen und Quellen. Eine wöchentliche Batterie von 25 Fragen sind rund 100 Messungen pro Monat und Plattform.",
      },
      {
        q: "Kann ich jederzeit kündigen?",
        a: "Ja, im Abrechnungsportal, wirksam zum Ende des bezahlten Zeitraums. Keine E-Mails, keine Anrufe.",
      },
      {
        q: "Mehrere Lokale?",
        a: "Das ist der Agenturplan, bepreist pro Portfolio. Schreiben Sie an {email}.",
      },
    ],
    perMonth: "/ Monat",
    free: "0 €",
    startFree: "Kostenlos starten",
    startUpgrade: "Kostenlos starten, im Panel upgraden",
    trialBadge: "{n} Tage gratis",
  },
  plans: {
    free: {
      blurb: "Den Ablauf mit eigenen Bewertungen testen.",
      features: [
        "3 Antworten pro Monat",
        "Entwurfs-Engine, ohne KI-Modell",
        "Klassifizierung und Risiko-Flags",
        "Markenstimme konfigurierbar",
      ],
    },
    starter: {
      blurb: "Für ein Lokal mit stetigem Bewertungsstrom.",
      features: [
        "15 KI-Antworten pro Monat",
        "Antworten vom KI-Modell",
        "Freigabe-Workflow und Protokoll",
        "Alles aus Free",
      ],
    },
    pro: {
      blurb: "Für ein volles Haus, dem jede Antwort wichtig ist.",
      features: [
        "Unbegrenzte KI-Antworten, Fair Use",
        "Sichtbarkeits-Dashboard, nur lesend",
        "Alles aus Starter",
      ],
    },
    visibility: {
      blurb: "Wissen, ob KI Sie empfiehlt, und beheben, warum nicht.",
      features: [
        "150 Sichtbarkeitsmessungen pro Monat",
        "Trend, Quellenkarte, Interventionsprotokoll",
        "Alles aus Pro",
      ],
    },
    unlimited: {
      blurb: "Für Lokale und Agenturen, die wöchentlich messen.",
      features: [
        "1000 Messungen pro Monat, Fair Use",
        "Platz für wöchentliche Batterien je Plattform",
        "Priorisierter Support",
        "Alles aus Visibility",
      ],
    },
  },
};

const uk: MarketingDict = {
  nav: { pricing: "Ціни", signIn: "Увійти", startFree: "Почати безкоштовно" },
  landing: {
    navVisibility: "Видимість в AI",
    kicker: "Європейська система видимості для локальних брендів",
    hero: {
      pre: "Коли гість питає AI, ",
      em: "вашому закладу",
      post: " є що сказати.",
    },
    lead: "toodip показує, як ваш бренд виглядає у відповідях AI — і допомагає лишати кориснішій слід у кожній важливій розмові з клієнтом.",
    ctaMeasure: "Виміряйте свою видимість",
    ctaReply: "До відповідей на відгуки",
    proof: [
      { value: "3", label: "джерела відповідей AI\nв одному вікні" },
      { value: "1", label: "послідовний спосіб\nроботи з відгуками" },
    ],
    marquee: [
      "Google AI Overviews",
      "ChatGPT",
      "Perplexity",
      "Відгуки Google",
      "Ваш бренд",
    ],
    card: {
      label: "ВИМІР ВИДИМОСТІ",
      live: "актуально",
      question: "Чи з'являється ваш заклад, коли вирішується вибір?",
      rows: ["Локальні рекомендації", "Відповіді на відгуки", "Власні джерела"],
      foot: "НОВИЙ СИГНАЛ",
      delta: "+ 14 балів",
    },
    vis: {
      eyebrow: "ВИДИМІСТЬ, ЯКУ ВИДНО",
      title: {
        pre: "Не вгадуйте, чи знає AI ваш заклад. ",
        blue: "Побачте слід.",
      },
      body: "toodip упорядковує запитання, відповіді та джерела, які формують образ вашого бренду. Ви знаєте, де будувати присутність — без маркетингового шуму.",
      shareLabel: "ЧАСТКА В РЕКОМЕНДАЦІЯХ",
      shareRows: ["Інші місця", "Конкуренти", "Ваш заклад"],
      shareNote: "Не звіт заради звіту. Напрям для наступного рішення.",
      srcLabel: "СИЛА ДЖЕРЕЛ",
      srcRows: [
        { name: "власний сайт", verdict: "сильний сигнал" },
        { name: "локальні путівники", verdict: "присутній" },
        { name: "соцмережі та відгуки", verdict: "підсилити" },
      ],
      srcNote: "Джерела, які системи AI цитують частіше за інші.",
      logEyebrow: "ЖУРНАЛ ЗМІН",
      logTitle: { pre: "Малі дії.", em: "Помітна різниця." },
      logKeys: ["відповіді", "джерела", "вимір"],
    },
    reply: {
      eyebrow: "НОВЕ В TOODIP",
      stamp: "МОДУЛЬ / 01",
      lead: "Відповіді на відгуки не мусять бути ще одним пунктом у списку справ. Reply Assistant допомагає писати їх голосом бренду — з тактом, послідовністю та потрібним контекстом.",
      benefits: [
        "Голос бренду збережено в кожній відповіді",
        "Важливі сигнали й теми підхоплено природно",
        "Останнє слово завжди за вами",
      ],
      cta: "Спробуйте на своїх відгуках",
      deskLabel: "ВІДГУК КЛІЄНТА",
      quote:
        "«Чудова кава, спокійно та зручно — повернуся, коли знову працюватиму в цій частині міста.»",
      response:
        "Дякуємо за такий конкретний відгук. Раді, що кава та спокійний простір допомогли вам добре використати час. До зустрічі наступного робочого дня.",
      tags: ["послідовний тон", "готово до схвалення"],
      approval: "потребує схвалення",
      copyAria: "Скопіювати відповідь",
    },
    source: {
      eyebrow: "ВІД ВІДПОВІДІ ДО ОБРАЗУ БРЕНДУ",
      title: { pre: "Краща відповідь — це ", blue: "більше, ніж реакція." },
      body: "Це маленький, але повторюваний сигнал: про стандарт обслуговування, характер місця й те, що варто запам'ятати. toodip складає ці сигнали в цілісну присутність бренду.",
      cta: "Переглянути варіанти виміру",
      caption: "ДЖЕРЕЛА / КОНТЕКСТ / ПРИСУТНІСТЬ",
    },
    pricing: {
      eyebrow: "ЦІНИ",
      title: { pre: "Дві лінійки продукту.", blue: "Одна панель." },
      body: "Оберіть, з чого почати. Будь-який план можна змінити пізніше просто з панелі оплат.",
      groupA: {
        title: "Reply Assistant",
        note: "Відповіді на відгуки, що працюють на цілісний образ закладу.",
        cta: "Почати з відгуків",
      },
      groupB: {
        title: "AI visibility",
        note: "Вимірюйте присутність бренду у відповідях, яких шукають ваші гості.",
        cta: "Почати вимір",
      },
      mostPopular: "Найчастіший вибір",
      footnote:
        "Місячні ціни в EUR. Рахунок-фактура з ПДВ під час оплати. Скасувати можна будь-коли з панелі оплат.",
    },
    faq: { eyebrow: "КОРОТКО І ПО СУТІ", title: { pre: "Поширені", blue: "запитання." } },
    footer: {
      tagline: "Видимість локального бренду\nв епоху відповідей AI.",
      cta: "Почати вимір",
    },
  },
  contact: {
    title: "Контакт",
    body: "Запитання, агентські плани або заклад, якому потрібні вимірювання і виправлення під ключ. Ми читаємо все на {email}.",
    formName: "Ваше ім'я або заклад",
    formMessage: "Чим можемо допомогти?",
    submit: "Відкрити в поштовому застосунку",
    direct: "Або напишіть напряму:",
  },
  footer: { product: "Продукт NotASlop" },
  pricing: {
    title: "Ціни",
    intro:
      "Дві продуктові лінії, одна панель. Місячні підписки в EUR, рахунки з ПДВ при оплаті, скасування в порталі розрахунків. Кожен акаунт починає безкоштовно, без картки.",
    replyTitle: "Стіл відповідей на відгуки",
    replyIntro:
      "Вставте відгук з Google, отримайте відповідь голосом закладу, затвердьте, опублікуйте. План визначає, скільки відповідей на місяць і чи пише їх модель ШІ.",
    visTitle: "Вимірювання видимості в ШІ",
    visIntro:
      "Повна аналітична панель: батареї вимірювань на ChatGPT, Google AI Overviews і Perplexity, частка голосу, мапи джерел, тренд показника і журнал втручань. Містить усе зі столу відповідей.",
    proNote:
      "План Pro містить панель видимості лише для читання: імпортовані базові лінії та минулі вимірювання, без запуску нових.",
    faqTitle: "Часті запитання",
    faq: [
      {
        q: "Чи отримаю я рахунок з ПДВ?",
        a: "Так. При оплаті ми збираємо платіжну адресу та податковий номер, і кожен рахунок їх містить. Рахунки завантажуються з порталу розрахунків у панелі.",
      },
      {
        q: "Що рахується як одна відповідь?",
        a: "Один відгук, для якого згенеровано відповідь у цьому календарному місяці. Чернетки та повторні генерації того самого відгуку входять у цю одну одиницю.",
      },
      {
        q: "Що рахується як одне вимірювання?",
        a: "Одне запитання, поставлене один раз одній платформі ШІ, зі збереженою відповіддю, згадками та джерелами. Щотижнева батарея з 25 запитань — це близько 100 вимірювань на місяць на платформу.",
      },
      {
        q: "Чи можу я скасувати будь-коли?",
        a: "Так, у порталі розрахунків, з кінцем оплаченого періоду. Без листів і дзвінків.",
      },
      {
        q: "Кілька закладів?",
        a: "Це агентський план, ціна за портфель. Напишіть на {email}.",
      },
    ],
    perMonth: "/ міс.",
    free: "0 €",
    startFree: "Почати безкоштовно",
    startUpgrade: "Почати безкоштовно, покращити в панелі",
    trialBadge: "{n} днів безкоштовно",
  },
  plans: {
    free: {
      blurb: "Спробуйте на власних відгуках.",
      features: [
        "3 відповіді на місяць",
        "Механізм чернеток, без моделі ШІ",
        "Класифікація і прапорці ризику",
        "Налаштування голосу бренду",
      ],
    },
    starter: {
      blurb: "Для закладу зі стабільним потоком відгуків.",
      features: [
        "15 відповідей ШІ на місяць",
        "Відповіді пише модель ШІ",
        "Затвердження і повний журнал подій",
        "Усе з плану Free",
      ],
    },
    pro: {
      blurb: "Для жвавого закладу, якому важлива кожна відповідь.",
      features: [
        "Відповіді ШІ без ліміту, fair use",
        "Панель видимості лише для читання",
        "Усе з плану Starter",
      ],
    },
    visibility: {
      blurb: "Знайте, чи рекомендує вас ШІ, і виправте, чому ні.",
      features: [
        "150 вимірювань видимості на місяць",
        "Тренд, мапа джерел, журнал втручань",
        "Усе з плану Pro",
      ],
    },
    unlimited: {
      blurb: "Для закладів і агенцій, що вимірюють щотижня.",
      features: [
        "1000 вимірювань на місяць, fair use",
        "Місце для щотижневих батарей на платформу",
        "Пріоритетна підтримка",
        "Усе з плану Visibility",
      ],
    },
  },
};

const fr: MarketingDict = {
  nav: { pricing: "Tarifs", signIn: "Se connecter", startFree: "Commencer gratuitement" },
  landing: {
    navVisibility: "Visibilité IA",
    kicker: "Un système européen de visibilité pour les marques locales",
    hero: {
      pre: "Quand un client interroge l'IA, ",
      em: "votre établissement",
      post: " devrait avoir son mot à dire.",
    },
    lead: "toodip montre comment votre marque apparaît dans les réponses de l'IA — et vous aide à laisser une trace plus utile dans chaque conversation qui compte.",
    ctaMeasure: "Mesurez votre visibilité",
    ctaReply: "Accéder aux réponses aux avis",
    proof: [
      { value: "3", label: "sources de réponses IA\ndans une seule vue" },
      { value: "1", label: "façon cohérente\nde traiter les avis" },
    ],
    marquee: [
      "Google AI Overviews",
      "ChatGPT",
      "Perplexity",
      "Avis Google",
      "Votre marque",
    ],
    card: {
      label: "MESURE DE VISIBILITÉ",
      live: "à jour",
      question: "Votre établissement apparaît-il au moment du choix ?",
      rows: ["Recommandations locales", "Réponses aux avis", "Sources propres"],
      foot: "NOUVEAU SIGNAL",
      delta: "+ 14 pts",
    },
    vis: {
      eyebrow: "UNE VISIBILITÉ QUI SE VOIT",
      title: {
        pre: "Ne devinez pas si l'IA connaît votre établissement. ",
        blue: "Voyez la trace.",
      },
      body: "toodip organise les questions, les réponses et les sources qui façonnent l'image de votre marque. Vous savez où construire votre présence — sans bruit marketing.",
      shareLabel: "PART DES RECOMMANDATIONS",
      shareRows: ["Autres lieux", "Concurrents", "Votre établissement"],
      shareNote: "Pas un rapport pour le rapport. Une direction pour la prochaine décision.",
      srcLabel: "FORCE DES SOURCES",
      srcRows: [
        { name: "site web propre", verdict: "signal fort" },
        { name: "guides locaux", verdict: "présent" },
        { name: "réseaux sociaux et avis", verdict: "à renforcer" },
      ],
      srcNote: "Les sources que les systèmes d'IA citent plus souvent que les autres.",
      logEyebrow: "JOURNAL DES CHANGEMENTS",
      logTitle: { pre: "Petites actions.", em: "Différence visible." },
      logKeys: ["réponses", "sources", "mesure"],
    },
    reply: {
      eyebrow: "NOUVEAU DANS TOODIP",
      stamp: "MODULE / 01",
      lead: "Répondre aux avis ne doit pas être une corvée de plus. Reply Assistant vous aide à les écrire dans le ton de votre marque — avec tact, cohérence et le contexte nécessaire.",
      benefits: [
        "La voix de la marque préservée dans chaque réponse",
        "Les signaux et sujets importants repris naturellement",
        "La décision finale vous appartient toujours",
      ],
      cta: "Essayer sur vos avis",
      deskLabel: "AVIS CLIENT",
      quote:
        "« Excellent café, calme et confortable — je reviendrai la prochaine fois que je travaille dans ce quartier. »",
      response:
        "Merci pour cet avis si précis. Nous sommes ravis que le café et le calme vous aient aidé à bien utiliser votre temps. À bientôt pour votre prochaine journée de travail.",
      tags: ["ton cohérent", "prêt à valider"],
      approval: "validation requise",
      copyAria: "Copier la réponse",
    },
    source: {
      eyebrow: "DE LA RÉPONSE À L'IMAGE DE MARQUE",
      title: { pre: "Une meilleure réponse est ", blue: "plus qu'une réaction." },
      body: "C'est un signal discret mais répétable : sur votre standard de service, le caractère du lieu et ce qu'il faut retenir. toodip assemble ces signaux en une présence de marque cohérente.",
      cta: "Voir les formules de mesure",
      caption: "SOURCES / CONTEXTE / PRÉSENCE",
    },
    pricing: {
      eyebrow: "TARIFS",
      title: { pre: "Deux lignes de produit.", blue: "Un seul panneau." },
      body: "Choisissez par où commencer. Chaque formule peut être changée plus tard, directement depuis l'espace de facturation.",
      groupA: {
        title: "Reply Assistant",
        note: "Des réponses aux avis qui construisent une image cohérente du lieu.",
        cta: "Commencer par les avis",
      },
      groupB: {
        title: "AI visibility",
        note: "Mesurez la présence de votre marque dans les réponses que cherchent vos clients.",
        cta: "Commencer la mesure",
      },
      mostPopular: "Choix le plus fréquent",
      footnote:
        "Prix mensuels en EUR. Facture avec TVA au paiement. Annulation possible à tout moment depuis l'espace de facturation.",
    },
    faq: { eyebrow: "COURT ET CONCRET", title: { pre: "Questions", blue: "fréquentes." } },
    footer: {
      tagline: "La visibilité des marques locales\nà l'ère des réponses IA.",
      cta: "Commencer la mesure",
    },
  },
  contact: {
    title: "Contact",
    body: "Questions, offres agence, ou un établissement qui veut la mesure et les corrections faites pour lui. Nous lisons tout à {email}.",
    formName: "Votre nom ou établissement",
    formMessage: "Comment pouvons-nous aider ?",
    submit: "Ouvrir dans votre messagerie",
    direct: "Ou écrivez directement :",
  },
  footer: { product: "Un produit NotASlop" },
  pricing: {
    title: "Tarifs",
    intro:
      "Deux lignes de produit, un panneau. Abonnements mensuels en EUR, factures avec TVA au paiement, résiliation depuis le portail de facturation. Chaque compte commence gratuitement, sans carte.",
    replyTitle: "Bureau des réponses aux avis",
    replyIntro:
      "Collez un avis Google, recevez une réponse dans la voix de l'établissement, validez, publiez. Le plan décide du nombre de réponses par mois et si le modèle IA les rédige.",
    visTitle: "Mesure de visibilité IA",
    visIntro:
      "Le panneau d'analyse complet : batteries de mesure sur ChatGPT, Google AI Overviews et Perplexity, part de voix, cartes des sources, tendance du score et journal des interventions. Inclut tout le bureau des réponses.",
    proNote:
      "Le plan Pro inclut le tableau de visibilité en lecture seule : bases importées et mesures passées, sans en lancer de nouvelles.",
    faqTitle: "Questions fréquentes",
    faq: [
      {
        q: "Ai-je une facture avec TVA ?",
        a: "Oui. Le paiement recueille votre adresse de facturation et votre numéro de TVA, et chaque facture les porte. Les factures se téléchargent depuis le portail de facturation.",
      },
      {
        q: "Que compte une réponse ?",
        a: "Un avis pour lequel une réponse a été générée ce mois calendaire. Brouillons et régénérations du même avis sont inclus dans cette unité.",
      },
      {
        q: "Que compte une mesure ?",
        a: "Une question posée une fois à une plateforme IA, avec la réponse complète, les mentions et les sources conservées. Une batterie hebdomadaire de 25 questions fait environ 100 mesures par mois et par plateforme.",
      },
      {
        q: "Puis-je résilier à tout moment ?",
        a: "Oui, depuis le portail de facturation, avec effet à la fin de la période payée. Ni e-mails, ni appels.",
      },
      {
        q: "Plusieurs établissements ?",
        a: "C'est l'offre agence, tarifée au portefeuille. Écrivez à {email}.",
      },
    ],
    perMonth: "/ mois",
    free: "0 €",
    startFree: "Commencer gratuitement",
    startUpgrade: "Commencer gratuitement, évoluer ensuite",
    trialBadge: "{n} jours gratuits",
  },
  plans: {
    free: {
      blurb: "Essayez le flux sur vos propres avis.",
      features: [
        "3 réponses par mois",
        "Moteur de brouillons, sans modèle IA",
        "Classification et signaux de risque",
        "Réglages de la voix de marque",
      ],
    },
    starter: {
      blurb: "Pour un établissement au flux d'avis régulier.",
      features: [
        "15 réponses IA par mois",
        "Réponses rédigées par le modèle IA",
        "Validation et journal complet",
        "Tout le plan Free",
      ],
    },
    pro: {
      blurb: "Pour un lieu animé qui tient à chaque réponse.",
      features: [
        "Réponses IA illimitées, usage raisonnable",
        "Tableau de visibilité en lecture seule",
        "Tout le plan Starter",
      ],
    },
    visibility: {
      blurb: "Sachez si l'IA vous recommande, et corrigez pourquoi non.",
      features: [
        "150 mesures de visibilité par mois",
        "Tendance, carte des sources, journal des interventions",
        "Tout le plan Pro",
      ],
    },
    unlimited: {
      blurb: "Pour les lieux et agences qui mesurent chaque semaine.",
      features: [
        "1000 mesures par mois, usage raisonnable",
        "De la place pour des batteries hebdomadaires par plateforme",
        "Support prioritaire",
        "Tout le plan Visibility",
      ],
    },
  },
};

const it: MarketingDict = {
  nav: { pricing: "Prezzi", signIn: "Accedi", startFree: "Inizia gratis" },
  landing: {
    navVisibility: "Visibilità IA",
    kicker: "Un sistema europeo di visibilità per i brand locali",
    hero: {
      pre: "Quando un ospite chiede all'IA, ",
      em: "il tuo locale",
      post: " dovrebbe avere qualcosa da dire.",
    },
    lead: "toodip mostra come il tuo brand appare nelle risposte dell'IA — e ti aiuta a lasciare una traccia più utile in ogni conversazione che conta.",
    ctaMeasure: "Misura la tua visibilità",
    ctaReply: "Vai alle risposte alle recensioni",
    proof: [
      { value: "3", label: "fonti di risposte IA\nin un'unica vista" },
      { value: "1", label: "un modo coerente\ndi gestire le recensioni" },
    ],
    marquee: [
      "Google AI Overviews",
      "ChatGPT",
      "Perplexity",
      "Recensioni Google",
      "Il tuo brand",
    ],
    card: {
      label: "MISURA DELLA VISIBILITÀ",
      live: "aggiornato",
      question: "Il tuo locale compare quando si decide la scelta?",
      rows: ["Raccomandazioni locali", "Risposte alle recensioni", "Fonti proprie"],
      foot: "NUOVO SEGNALE",
      delta: "+ 14 pt",
    },
    vis: {
      eyebrow: "UNA VISIBILITÀ CHE SI VEDE",
      title: {
        pre: "Non indovinare se l'IA conosce il tuo locale. ",
        blue: "Guarda la traccia.",
      },
      body: "toodip ordina le domande, le risposte e le fonti che formano l'immagine del tuo brand. Sai dove costruire presenza — senza rumore di marketing.",
      shareLabel: "QUOTA DELLE RACCOMANDAZIONI",
      shareRows: ["Altri locali", "Concorrenti", "Il tuo locale"],
      shareNote: "Non un report per il report. Una direzione per la prossima decisione.",
      srcLabel: "FORZA DELLE FONTI",
      srcRows: [
        { name: "sito proprio", verdict: "segnale forte" },
        { name: "guide locali", verdict: "presente" },
        { name: "social e recensioni", verdict: "da rafforzare" },
      ],
      srcNote: "Le fonti che i sistemi di IA citano più spesso delle altre.",
      logEyebrow: "REGISTRO DEI CAMBIAMENTI",
      logTitle: { pre: "Piccole azioni.", em: "Differenza visibile." },
      logKeys: ["risposte", "fonti", "misura"],
    },
    reply: {
      eyebrow: "NOVITÀ IN TOODIP",
      stamp: "MODULO / 01",
      lead: "Rispondere alle recensioni non deve essere l'ennesima incombenza. Reply Assistant ti aiuta a scriverle nel tono del tuo brand — con tatto, coerenza e il contesto necessario.",
      benefits: [
        "La voce del brand preservata in ogni risposta",
        "Segnali e temi importanti colti con naturalezza",
        "L'ultima parola resta sempre a te",
      ],
      cta: "Provalo sulle tue recensioni",
      deskLabel: "RECENSIONE DEL CLIENTE",
      quote:
        "«Ottimo caffè, tranquillo e comodo — tornerò la prossima volta che lavoro in questa zona.»",
      response:
        "Grazie per una recensione così concreta. Siamo felici che il caffè e la calma ti abbiano aiutato a usare bene il tuo tempo. A presto, alla prossima giornata di lavoro.",
      tags: ["tono coerente", "pronto per l'approvazione"],
      approval: "richiede approvazione",
      copyAria: "Copia risposta",
    },
    source: {
      eyebrow: "DALLA RISPOSTA ALL'IMMAGINE DEL BRAND",
      title: { pre: "Una risposta migliore è ", blue: "più di una reazione." },
      body: "È un segnale piccolo ma ripetibile: sullo standard del servizio, sul carattere del locale e su ciò che vale la pena ricordare. toodip compone questi segnali in una presenza di brand coerente.",
      cta: "Vedi le varianti di misura",
      caption: "FONTI / CONTESTO / PRESENZA",
    },
    pricing: {
      eyebrow: "PREZZI",
      title: { pre: "Due linee di prodotto.", blue: "Un unico pannello." },
      body: "Scegli da dove iniziare. Ogni piano può essere cambiato in seguito, direttamente dal pannello di fatturazione.",
      groupA: {
        title: "Reply Assistant",
        note: "Risposte alle recensioni che lavorano per un'immagine coerente del locale.",
        cta: "Inizia dalle recensioni",
      },
      groupB: {
        title: "AI visibility",
        note: "Misura la presenza del brand nelle risposte che i tuoi ospiti cercano.",
        cta: "Inizia la misura",
      },
      mostPopular: "Scelta più frequente",
      footnote:
        "Prezzi mensili in EUR. Fattura con IVA al pagamento. Puoi annullare in qualsiasi momento dal pannello di fatturazione.",
    },
    faq: { eyebrow: "BREVE E CONCRETO", title: { pre: "Domande", blue: "frequenti." } },
    footer: {
      tagline: "La visibilità dei brand locali\nnell'era delle risposte IA.",
      cta: "Inizia la misura",
    },
  },
  contact: {
    title: "Contatti",
    body: "Domande, piani agenzia, o un locale che vuole misurazione e correzioni fatte per lui. Leggiamo tutto a {email}.",
    formName: "Il tuo nome o locale",
    formMessage: "Come possiamo aiutare?",
    submit: "Apri nella tua app di posta",
    direct: "O scrivi direttamente:",
  },
  footer: { product: "Un prodotto NotASlop" },
  pricing: {
    title: "Prezzi",
    intro:
      "Due linee di prodotto, un pannello. Abbonamenti mensili in EUR, fatture con IVA al pagamento, disdetta dal portale di fatturazione. Ogni account inizia gratis, senza carta.",
    replyTitle: "Scrivania delle risposte alle recensioni",
    replyIntro:
      "Incolla una recensione Google, ricevi una risposta con la voce del locale, approva, pubblica. Il piano decide quante risposte al mese e se le scrive il modello AI.",
    visTitle: "Misurazione della visibilità AI",
    visIntro:
      "Il pannello di analisi completo: batterie di misurazione su ChatGPT, Google AI Overviews e Perplexity, share of voice, mappe delle fonti, trend del punteggio e registro degli interventi. Include tutta la scrivania delle risposte.",
    proNote:
      "Il piano Pro include il pannello di visibilità in sola lettura: basi importate e misurazioni passate, senza lanciarne di nuove.",
    faqTitle: "Domande frequenti",
    faq: [
      {
        q: "Ricevo una fattura con IVA?",
        a: "Sì. Il pagamento raccoglie indirizzo di fatturazione e partita IVA, e ogni fattura li riporta. Le fatture si scaricano dal portale di fatturazione.",
      },
      {
        q: "Cosa conta come una risposta?",
        a: "Una recensione per cui è stata generata una risposta nel mese di calendario. Bozze e rigenerazioni della stessa recensione sono incluse in quell'unità.",
      },
      {
        q: "Cosa conta come una misurazione?",
        a: "Una domanda posta una volta a una piattaforma AI, con risposta completa, menzioni e fonti salvate. Una batteria settimanale di 25 domande fa circa 100 misurazioni al mese per piattaforma.",
      },
      {
        q: "Posso disdire quando voglio?",
        a: "Sì, dal portale di fatturazione, con effetto a fine periodo pagato. Niente e-mail, niente telefonate.",
      },
      {
        q: "Gestisci più locali?",
        a: "È il piano agenzia, prezzato a portafoglio. Scrivi a {email}.",
      },
    ],
    perMonth: "/ mese",
    free: "0 €",
    startFree: "Inizia gratis",
    startUpgrade: "Inizia gratis, fai upgrade dopo",
    trialBadge: "{n} giorni gratis",
  },
  plans: {
    free: {
      blurb: "Prova il flusso sulle tue recensioni.",
      features: [
        "3 risposte al mese",
        "Motore di bozze, senza modello AI",
        "Classificazione e segnali di rischio",
        "Impostazioni della voce del brand",
      ],
    },
    starter: {
      blurb: "Per un locale con un flusso regolare di recensioni.",
      features: [
        "15 risposte AI al mese",
        "Risposte scritte dal modello AI",
        "Approvazione e registro completo",
        "Tutto il piano Free",
      ],
    },
    pro: {
      blurb: "Per un locale pieno che tiene a ogni risposta.",
      features: [
        "Risposte AI illimitate, fair use",
        "Pannello di visibilità in sola lettura",
        "Tutto il piano Starter",
      ],
    },
    visibility: {
      blurb: "Sappi se l'AI ti consiglia, e sistema il perché no.",
      features: [
        "150 misurazioni di visibilità al mese",
        "Trend, mappa delle fonti, registro interventi",
        "Tutto il piano Pro",
      ],
    },
    unlimited: {
      blurb: "Per locali e agenzie che misurano ogni settimana.",
      features: [
        "1000 misurazioni al mese, fair use",
        "Spazio per batterie settimanali per piattaforma",
        "Supporto prioritario",
        "Tutto il piano Visibility",
      ],
    },
  },
};

export const MARKETING_DICTS: Record<MarketingLocale, MarketingDict> = {
  en,
  pl,
  de,
  uk,
  fr,
  it,
};

export function isMarketingLocale(value: string): value is MarketingLocale {
  return (MARKETING_LOCALES as string[]).includes(value);
}
