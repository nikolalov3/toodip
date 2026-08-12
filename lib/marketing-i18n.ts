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
  hero: {
    kicker: string;
    title: string;
    body: string;
    ctaMeasure: string;
    ctaPricing: string;
  };
  evidence: {
    title: string;
    body: string;
    sovTitle: string;
    sovNote: string;
    sourcesTitle: string;
    sourcesNote: string;
    yourVenue: string;
    competitor: string;
    citations: string;
  };
  gates: {
    title: string;
    items: Array<{ title: string; body: string }>;
    interventionLead: string;
    interventionBody: string;
  };
  reply: {
    kicker: string;
    title: string;
    body: string;
    cta: string;
    bullets: string[];
  };
  teaser: { title: string; body: string; cta: string };
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
  hero: {
    kicker: "AI visibility for local business, built in Europe",
    title:
      "Your next guest didn't search. They asked an AI, and it named three places.",
    body: "toodip asks ChatGPT, Google AI Overviews and Perplexity the questions your customers ask, records every answer, and shows you whether your name is in them. Then it shows which sources the AI trusted, so you know exactly what to fix. No magic, no promises. Evidence.",
    ctaMeasure: "Measure your venue",
    ctaPricing: "See pricing",
  },
  evidence: {
    title: "What a measurement looks like",
    body: "A battery of real customer questions runs against each platform. Every answer is stored with who was mentioned and what was cited.",
    sovTitle: "Share of voice, category questions",
    sovNote: "The uncomfortable chart. Also the one that moves.",
    sourcesTitle: "Which sources feed the answers",
    sourcesNote:
      "When your own site has zero citations, that is not bad luck. That is the to-do list.",
    yourVenue: "Your venue",
    competitor: "Competitor",
    citations: "citations",
  },
  gates: {
    title: "Three questions, in order",
    items: [
      {
        title: "Does AI know you exist?",
        body: "Ask about your venue by name across ChatGPT, Google AI Overviews and Perplexity. If the answer is thin or wrong, the record work starts here.",
      },
      {
        title: "Does AI recommend you?",
        body: "Ask the way real customers ask: best in the district, open late, good for working. Either your name is in the answer or a competitor's is.",
      },
      {
        title: "Do the sources support you?",
        body: "Every answer cites somewhere: guides, Instagram, Google records, blogs. We map which domains feed each platform, and where you are missing.",
      },
    ],
    interventionLead: "Then you fix things, and the line answers back.",
    interventionBody:
      "Every change you make is logged next to the measurements, so when the score moves you know which work moved it. That log is the difference between a report and a method.",
  },
  reply: {
    kicker: "Also in the panel",
    title: "The review reply desk",
    body: "Review replies are one of the sources AI reads, and the easiest one to control. Paste a Google review, get a reply in your own voice, approve it, publish it. Risky reviews never go out without a human. From {price} a month, free to try.",
    cta: "Try it on your reviews",
    bullets: [
      "Paste a review, it lands classified: sentiment, risk, who must sign off.",
      "AI drafts in your tone, with your phrases and your rules baked in.",
      "Refunds, staff names and legal threats never reach the public unapproved.",
    ],
  },
  teaser: {
    title: "Reply desk from {reply}. Visibility from {visibility}.",
    body: "Monthly subscriptions, 7 days free on the bigger plans, cancel any time. VAT invoices at checkout.",
    cta: "Full pricing",
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
        q: "How do trials work?",
        a: "Pro and Visibility start with 7 days free. You add a card at checkout, pay nothing for a week, and can cancel from the billing portal before the first charge.",
      },
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
        "First 7 days free",
        "Unlimited AI replies, fair use",
        "Visibility dashboard, read only",
        "Everything in Starter",
      ],
    },
    visibility: {
      blurb: "Know whether AI recommends you, and fix why not.",
      features: [
        "First 7 days free",
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
  hero: {
    kicker: "Widoczność w AI dla lokalnego biznesu, budowane w Europie",
    title:
      "Twój następny gość nie szukał w Google. Zapytał AI, a ono wymieniło trzy miejsca.",
    body: "toodip zadaje ChatGPT, Google AI Overviews i Perplexity pytania, które zadają Twoi klienci, zapisuje każdą odpowiedź i pokazuje, czy pada w nich Twoja nazwa. Potem pokazuje, którym źródłom AI zaufało, więc wiesz dokładnie, co poprawić. Bez magii i obietnic. Dowody.",
    ctaMeasure: "Zmierz swój lokal",
    ctaPricing: "Zobacz cennik",
  },
  evidence: {
    title: "Jak wygląda pomiar",
    body: "Bateria prawdziwych pytań klientów uruchamiana na każdej platformie. Każda odpowiedź jest zapisana wraz z tym, kogo wymieniono i co zacytowano.",
    sovTitle: "Udział w odpowiedziach, pytania kategorii",
    sovNote: "Niewygodny wykres. Ale to on się rusza.",
    sourcesTitle: "Które źródła karmią odpowiedzi",
    sourcesNote:
      "Kiedy Twoja strona ma zero cytowań, to nie pech. To lista zadań.",
    yourVenue: "Twój lokal",
    competitor: "Konkurent",
    citations: "cytowań",
  },
  gates: {
    title: "Trzy pytania, po kolei",
    items: [
      {
        title: "Czy AI wie, że istniejesz?",
        body: "Zapytaj o swój lokal po nazwie w ChatGPT, Google AI Overviews i Perplexity. Jeśli odpowiedź jest uboga albo błędna, praca nad wizytówką zaczyna się tutaj.",
      },
      {
        title: "Czy AI Cię poleca?",
        body: "Pytaj tak, jak pytają klienci: najlepsze w dzielnicy, otwarte późno, dobre do pracy. Albo w odpowiedzi jest Twoja nazwa, albo konkurenta.",
      },
      {
        title: "Czy źródła Cię wspierają?",
        body: "Każda odpowiedź coś cytuje: przewodniki, Instagram, wizytówki Google, blogi. Mapujemy, które domeny karmią każdą platformę i gdzie Cię brakuje.",
      },
    ],
    interventionLead: "Potem poprawiasz, a linia odpowiada.",
    interventionBody:
      "Każda zmiana jest logowana obok pomiarów, więc gdy wynik się rusza, wiesz, która praca go ruszyła. Ten dziennik to różnica między raportem a metodą.",
  },
  reply: {
    kicker: "Również w panelu",
    title: "Biurko odpowiedzi na opinie",
    body: "Odpowiedzi na opinie to jedno ze źródeł, które AI czyta, i najłatwiejsze do kontrolowania. Wklej opinię z Google, dostań odpowiedź w swoim głosie, zatwierdź, opublikuj. Ryzykowne opinie nigdy nie wychodzą bez człowieka. Od {price} miesięcznie, za darmo na próbę.",
    cta: "Wypróbuj na swoich opiniach",
    bullets: [
      "Wklejasz opinię, ląduje sklasyfikowana: sentyment, ryzyko, kto musi zatwierdzić.",
      "AI pisze w Twoim tonie, z Twoimi frazami i zasadami.",
      "Zwroty pieniędzy, imiona pracowników i groźby prawne nigdy nie trafiają do sieci bez zgody.",
    ],
  },
  teaser: {
    title: "Odpowiedzi od {reply}. Widoczność od {visibility}.",
    body: "Subskrypcje miesięczne, 7 dni za darmo na większych planach, anulujesz kiedy chcesz. Faktury VAT przy płatności.",
    cta: "Pełny cennik",
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
        q: "Jak działają okresy próbne?",
        a: "Pro i Visibility zaczynają od 7 dni za darmo. Podajesz kartę przy płatności, przez tydzień nie płacisz nic i możesz anulować w portalu rozliczeń przed pierwszym obciążeniem.",
      },
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
        "Pierwsze 7 dni za darmo",
        "Odpowiedzi AI bez limitu, fair use",
        "Panel widoczności tylko do odczytu",
        "Wszystko z planu Starter",
      ],
    },
    visibility: {
      blurb: "Wiedz, czy AI Cię poleca, i napraw dlaczego nie.",
      features: [
        "Pierwsze 7 dni za darmo",
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
  hero: {
    kicker: "KI-Sichtbarkeit für lokale Unternehmen, gebaut in Europa",
    title:
      "Ihr nächster Gast hat nicht gegoogelt. Er hat eine KI gefragt, und sie nannte drei Orte.",
    body: "toodip stellt ChatGPT, Google AI Overviews und Perplexity die Fragen Ihrer Kunden, speichert jede Antwort und zeigt, ob Ihr Name darin vorkommt. Danach sehen Sie, welchen Quellen die KI vertraut hat, damit Sie genau wissen, was zu tun ist. Keine Magie, keine Versprechen. Belege.",
    ctaMeasure: "Ihr Lokal messen",
    ctaPricing: "Preise ansehen",
  },
  evidence: {
    title: "So sieht eine Messung aus",
    body: "Eine Batterie echter Kundenfragen läuft gegen jede Plattform. Jede Antwort wird gespeichert, samt Erwähnungen und zitierten Quellen.",
    sovTitle: "Share of Voice, Kategorie-Fragen",
    sovNote: "Die unbequeme Grafik. Aber die, die sich bewegt.",
    sourcesTitle: "Welche Quellen die Antworten speisen",
    sourcesNote:
      "Wenn die eigene Website null Zitate hat, ist das kein Pech. Das ist die Aufgabenliste.",
    yourVenue: "Ihr Lokal",
    competitor: "Wettbewerber",
    citations: "Zitate",
  },
  gates: {
    title: "Drei Fragen, der Reihe nach",
    items: [
      {
        title: "Weiß die KI, dass es Sie gibt?",
        body: "Fragen Sie nach Ihrem Lokal beim Namen, in ChatGPT, Google AI Overviews und Perplexity. Ist die Antwort dünn oder falsch, beginnt hier die Arbeit am Eintrag.",
      },
      {
        title: "Empfiehlt die KI Sie?",
        body: "Fragen Sie wie echte Kunden: das Beste im Viertel, spät geöffnet, gut zum Arbeiten. Entweder steht Ihr Name in der Antwort oder der eines Wettbewerbers.",
      },
      {
        title: "Stützen die Quellen Sie?",
        body: "Jede Antwort zitiert etwas: Guides, Instagram, Google-Einträge, Blogs. Wir kartieren, welche Domains jede Plattform speisen und wo Sie fehlen.",
      },
    ],
    interventionLead: "Dann beheben Sie es, und die Linie antwortet.",
    interventionBody:
      "Jede Änderung wird neben den Messungen protokolliert. Bewegt sich der Wert, wissen Sie, welche Arbeit ihn bewegt hat. Dieses Protokoll unterscheidet einen Bericht von einer Methode.",
  },
  reply: {
    kicker: "Ebenfalls im Panel",
    title: "Der Antwort-Schreibtisch für Bewertungen",
    body: "Antworten auf Bewertungen sind eine der Quellen, die KI liest, und die am leichtesten kontrollierbare. Google-Bewertung einfügen, Antwort in Ihrer Stimme erhalten, freigeben, veröffentlichen. Riskante Bewertungen gehen nie ohne Menschen raus. Ab {price} im Monat, kostenlos testbar.",
    cta: "Mit Ihren Bewertungen testen",
    bullets: [
      "Bewertung einfügen, sie landet klassifiziert: Stimmung, Risiko, wer freigeben muss.",
      "Die KI schreibt in Ihrem Ton, mit Ihren Formulierungen und Regeln.",
      "Erstattungen, Mitarbeiternamen und Rechtsdrohungen erreichen die Öffentlichkeit nie ungeprüft.",
    ],
  },
  teaser: {
    title: "Antworten ab {reply}. Sichtbarkeit ab {visibility}.",
    body: "Monatsabos, 7 Tage gratis bei den größeren Plänen, jederzeit kündbar. Rechnungen mit USt. beim Checkout.",
    cta: "Alle Preise",
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
        q: "Wie funktionieren die Testphasen?",
        a: "Pro und Visibility starten mit 7 Tagen gratis. Sie hinterlegen beim Checkout eine Karte, zahlen eine Woche nichts und können vor der ersten Abbuchung im Abrechnungsportal kündigen.",
      },
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
        "Die ersten 7 Tage gratis",
        "Unbegrenzte KI-Antworten, Fair Use",
        "Sichtbarkeits-Dashboard, nur lesend",
        "Alles aus Starter",
      ],
    },
    visibility: {
      blurb: "Wissen, ob KI Sie empfiehlt, und beheben, warum nicht.",
      features: [
        "Die ersten 7 Tage gratis",
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
  hero: {
    kicker: "Видимість в ШІ для локального бізнесу, створено в Європі",
    title:
      "Ваш наступний гість не шукав у Google. Він запитав ШІ, і той назвав три місця.",
    body: "toodip ставить ChatGPT, Google AI Overviews і Perplexity запитання, які ставлять ваші клієнти, зберігає кожну відповідь і показує, чи є в них ваша назва. Потім показує, яким джерелам ШІ довірився, щоб ви точно знали, що виправити. Без магії та обіцянок. Докази.",
    ctaMeasure: "Виміряти свій заклад",
    ctaPricing: "Переглянути ціни",
  },
  evidence: {
    title: "Як виглядає вимірювання",
    body: "Батарея справжніх запитань клієнтів запускається на кожній платформі. Кожна відповідь зберігається разом зі згадками та цитованими джерелами.",
    sovTitle: "Частка голосу, запитання категорії",
    sovNote: "Незручний графік. Але саме він рухається.",
    sourcesTitle: "Які джерела живлять відповіді",
    sourcesNote:
      "Коли ваш сайт має нуль цитувань, це не невдача. Це список завдань.",
    yourVenue: "Ваш заклад",
    competitor: "Конкурент",
    citations: "цитувань",
  },
  gates: {
    title: "Три запитання, по черзі",
    items: [
      {
        title: "Чи знає ШІ, що ви існуєте?",
        body: "Запитайте про свій заклад за назвою в ChatGPT, Google AI Overviews і Perplexity. Якщо відповідь бідна або хибна, робота над карткою починається тут.",
      },
      {
        title: "Чи рекомендує вас ШІ?",
        body: "Питайте так, як питають клієнти: найкраще в районі, відчинено допізна, зручно працювати. Або у відповіді ваша назва, або назва конкурента.",
      },
      {
        title: "Чи підтримують вас джерела?",
        body: "Кожна відповідь щось цитує: путівники, Instagram, картки Google, блоги. Ми мапуємо, які домени живлять кожну платформу і де вас бракує.",
      },
    ],
    interventionLead: "Потім ви виправляєте, і лінія відповідає.",
    interventionBody:
      "Кожна зміна фіксується поруч із вимірюваннями, тож коли показник рухається, ви знаєте, яка робота його зрушила. Цей журнал і відрізняє звіт від методу.",
  },
  reply: {
    kicker: "Також у панелі",
    title: "Стіл відповідей на відгуки",
    body: "Відповіді на відгуки — це одне з джерел, які читає ШІ, і найлегше контрольоване. Вставте відгук з Google, отримайте відповідь вашим голосом, затвердьте, опублікуйте. Ризиковані відгуки ніколи не виходять без людини. Від {price} на місяць, безкоштовно на пробу.",
    cta: "Спробувати на своїх відгуках",
    bullets: [
      "Вставляєте відгук, він одразу класифікований: настрій, ризик, хто має затвердити.",
      "ШІ пише вашим тоном, з вашими фразами та правилами.",
      "Повернення коштів, імена працівників і юридичні погрози ніколи не виходять без погодження.",
    ],
  },
  teaser: {
    title: "Відповіді від {reply}. Видимість від {visibility}.",
    body: "Місячні підписки, 7 днів безкоштовно на більших планах, скасування будь-коли. Рахунки з ПДВ при оплаті.",
    cta: "Повний прайс",
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
        q: "Як працюють пробні періоди?",
        a: "Pro і Visibility починаються з 7 безкоштовних днів. Ви додаєте картку при оплаті, тиждень не платите нічого і можете скасувати в порталі розрахунків до першого списання.",
      },
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
        "Перші 7 днів безкоштовно",
        "Відповіді ШІ без ліміту, fair use",
        "Панель видимості лише для читання",
        "Усе з плану Starter",
      ],
    },
    visibility: {
      blurb: "Знайте, чи рекомендує вас ШІ, і виправте, чому ні.",
      features: [
        "Перші 7 днів безкоштовно",
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
  hero: {
    kicker: "Visibilité IA pour les commerces locaux, construit en Europe",
    title:
      "Votre prochain client n'a pas cherché sur Google. Il a demandé à une IA, qui a cité trois adresses.",
    body: "toodip pose à ChatGPT, Google AI Overviews et Perplexity les questions que posent vos clients, enregistre chaque réponse et vous montre si votre nom y figure. Puis il montre quelles sources l'IA a crues, pour que vous sachiez exactement quoi corriger. Ni magie, ni promesses. Des preuves.",
    ctaMeasure: "Mesurer votre établissement",
    ctaPricing: "Voir les tarifs",
  },
  evidence: {
    title: "À quoi ressemble une mesure",
    body: "Une batterie de vraies questions de clients tourne sur chaque plateforme. Chaque réponse est conservée avec les mentions et les sources citées.",
    sovTitle: "Part de voix, questions de catégorie",
    sovNote: "Le graphique inconfortable. Mais c'est lui qui bouge.",
    sourcesTitle: "Quelles sources nourrissent les réponses",
    sourcesNote:
      "Quand votre propre site a zéro citation, ce n'est pas de la malchance. C'est la liste des tâches.",
    yourVenue: "Votre établissement",
    competitor: "Concurrent",
    citations: "citations",
  },
  gates: {
    title: "Trois questions, dans l'ordre",
    items: [
      {
        title: "L'IA sait-elle que vous existez ?",
        body: "Demandez votre établissement par son nom sur ChatGPT, Google AI Overviews et Perplexity. Si la réponse est maigre ou fausse, le travail sur la fiche commence ici.",
      },
      {
        title: "L'IA vous recommande-t-elle ?",
        body: "Demandez comme vos clients : le meilleur du quartier, ouvert tard, pratique pour travailler. Soit votre nom est dans la réponse, soit celui d'un concurrent.",
      },
      {
        title: "Les sources vous soutiennent-elles ?",
        body: "Chaque réponse cite quelque chose : guides, Instagram, fiches Google, blogs. Nous cartographions les domaines qui nourrissent chaque plateforme, et où vous manquez.",
      },
    ],
    interventionLead: "Ensuite vous corrigez, et la courbe répond.",
    interventionBody:
      "Chaque changement est consigné à côté des mesures. Quand le score bouge, vous savez quel travail l'a fait bouger. Ce journal fait la différence entre un rapport et une méthode.",
  },
  reply: {
    kicker: "Aussi dans le panneau",
    title: "Le bureau des réponses aux avis",
    body: "Les réponses aux avis sont l'une des sources que lit l'IA, et la plus facile à contrôler. Collez un avis Google, recevez une réponse dans votre voix, validez, publiez. Les avis à risque ne sortent jamais sans un humain. À partir de {price} par mois, essai gratuit.",
    cta: "Essayer sur vos avis",
    bullets: [
      "Collez un avis, il arrive classé : sentiment, risque, qui doit valider.",
      "L'IA rédige dans votre ton, avec vos formules et vos règles.",
      "Remboursements, noms d'employés et menaces juridiques ne sortent jamais sans validation.",
    ],
  },
  teaser: {
    title: "Réponses dès {reply}. Visibilité dès {visibility}.",
    body: "Abonnements mensuels, 7 jours gratuits sur les grands plans, résiliable à tout moment. Factures avec TVA au paiement.",
    cta: "Tous les tarifs",
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
        q: "Comment fonctionnent les essais ?",
        a: "Pro et Visibility commencent par 7 jours gratuits. Vous ajoutez une carte au paiement, ne payez rien pendant une semaine et pouvez résilier depuis le portail avant le premier prélèvement.",
      },
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
        "7 premiers jours gratuits",
        "Réponses IA illimitées, usage raisonnable",
        "Tableau de visibilité en lecture seule",
        "Tout le plan Starter",
      ],
    },
    visibility: {
      blurb: "Sachez si l'IA vous recommande, et corrigez pourquoi non.",
      features: [
        "7 premiers jours gratuits",
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
  hero: {
    kicker: "Visibilità AI per le attività locali, costruito in Europa",
    title:
      "Il tuo prossimo ospite non ha cercato su Google. Ha chiesto a un'AI, che ha nominato tre posti.",
    body: "toodip pone a ChatGPT, Google AI Overviews e Perplexity le domande che fanno i tuoi clienti, registra ogni risposta e ti mostra se il tuo nome c'è. Poi mostra a quali fonti l'AI ha creduto, così sai esattamente cosa sistemare. Niente magia, niente promesse. Prove.",
    ctaMeasure: "Misura il tuo locale",
    ctaPricing: "Vedi i prezzi",
  },
  evidence: {
    title: "Come appare una misurazione",
    body: "Una batteria di vere domande dei clienti gira su ogni piattaforma. Ogni risposta viene salvata con le menzioni e le fonti citate.",
    sovTitle: "Share of voice, domande di categoria",
    sovNote: "Il grafico scomodo. Ma è quello che si muove.",
    sourcesTitle: "Quali fonti alimentano le risposte",
    sourcesNote:
      "Quando il tuo sito ha zero citazioni, non è sfortuna. È la lista delle cose da fare.",
    yourVenue: "Il tuo locale",
    competitor: "Concorrente",
    citations: "citazioni",
  },
  gates: {
    title: "Tre domande, in ordine",
    items: [
      {
        title: "L'AI sa che esisti?",
        body: "Chiedi del tuo locale per nome su ChatGPT, Google AI Overviews e Perplexity. Se la risposta è povera o sbagliata, il lavoro sulla scheda inizia qui.",
      },
      {
        title: "L'AI ti consiglia?",
        body: "Chiedi come chiedono i clienti: il migliore del quartiere, aperto fino a tardi, comodo per lavorare. O nella risposta c'è il tuo nome, o quello di un concorrente.",
      },
      {
        title: "Le fonti ti sostengono?",
        body: "Ogni risposta cita qualcosa: guide, Instagram, schede Google, blog. Mappiamo quali domini alimentano ogni piattaforma e dove manchi.",
      },
    ],
    interventionLead: "Poi sistemi le cose, e la linea risponde.",
    interventionBody:
      "Ogni modifica viene registrata accanto alle misurazioni. Quando il punteggio si muove, sai quale lavoro lo ha mosso. Quel registro è la differenza tra un report e un metodo.",
  },
  reply: {
    kicker: "Anche nel pannello",
    title: "La scrivania delle risposte alle recensioni",
    body: "Le risposte alle recensioni sono una delle fonti che l'AI legge, e la più facile da controllare. Incolla una recensione Google, ricevi una risposta con la tua voce, approva, pubblica. Le recensioni a rischio non escono mai senza un umano. Da {price} al mese, prova gratuita.",
    cta: "Provalo sulle tue recensioni",
    bullets: [
      "Incolli una recensione, arriva classificata: sentimento, rischio, chi deve approvare.",
      "L'AI scrive nel tuo tono, con le tue frasi e le tue regole.",
      "Rimborsi, nomi dei dipendenti e minacce legali non escono mai senza approvazione.",
    ],
  },
  teaser: {
    title: "Risposte da {reply}. Visibilità da {visibility}.",
    body: "Abbonamenti mensili, 7 giorni gratis sui piani maggiori, disdici quando vuoi. Fatture con IVA al pagamento.",
    cta: "Tutti i prezzi",
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
        q: "Come funzionano le prove?",
        a: "Pro e Visibility iniziano con 7 giorni gratis. Aggiungi una carta al pagamento, per una settimana non paghi nulla e puoi disdire dal portale prima del primo addebito.",
      },
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
        "Primi 7 giorni gratis",
        "Risposte AI illimitate, fair use",
        "Pannello di visibilità in sola lettura",
        "Tutto il piano Starter",
      ],
    },
    visibility: {
      blurb: "Sappi se l'AI ti consiglia, e sistema il perché no.",
      features: [
        "Primi 7 giorni gratis",
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
