import type { DemoDataset } from "@/lib/demo/dataset";
import type {
  ActivityLog,
  BrandVoiceExample,
  BusinessProfile,
  KeywordBankItem,
  Profile,
  Review,
  ReviewApproval,
  ReviewDraft,
  ReviewRiskFlag,
  Tenant,
  TenantMember,
} from "@/types/domain";

/**
 * Seed workspace: an independent speciality cafe in Kazimierz, Krakow.
 *
 * The mix is deliberate. It contains the review types an operator actually has
 * to handle in a week: effusive five stars, a detailed four, a mixed three, a
 * furious one star naming a barista, a hygiene complaint, a probable fake, a
 * competitor plug and a legal threat. Reviews arrive in Polish and English
 * because that is what a Krakow venue really receives.
 */

export const DEMO_TENANT_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_BUSINESS_PROFILE_ID = "22222222-2222-4222-8222-222222222222";

export const DEMO_USERS = {
  owner: {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    fullName: "Marta Zielinska",
    email: "marta@cafekolektyw.pl",
    initials: "MZ",
    role: "tenant_admin" as const,
    jobTitle: "Owner",
  },
  manager: {
    id: "aaaaaaaa-0000-4000-8000-000000000002",
    fullName: "Jakub Nowak",
    email: "jakub@cafekolektyw.pl",
    initials: "JN",
    role: "tenant_member" as const,
    jobTitle: "Floor manager",
  },
  operator: {
    id: "aaaaaaaa-0000-4000-8000-000000000003",
    fullName: "Nikola Krecisz",
    email: "ops@reviewreply.app",
    initials: "NK",
    role: "platform_admin" as const,
    jobTitle: "Platform operator",
  },
} as const;

export type DemoUserKey = keyof typeof DEMO_USERS;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function iso(offsetMs: number, base: number): string {
  return new Date(base - offsetMs).toISOString();
}

function id(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

interface SeedReviewSpec {
  n: number;
  source: Review["source"];
  reviewer: string | null;
  stars: number;
  language: string;
  daysAgo: number;
  text: string;
  status: Review["status"];
  sentiment: Review["sentiment"];
  riskScore: number;
  requiresApproval: boolean;
  assignedTo?: string | null;
  flags?: Array<{
    type: ReviewRiskFlag["flagType"];
    severity: ReviewRiskFlag["severity"];
    evidence: string;
  }>;
  /** Reply already live on the platform, with hours taken to answer. */
  published?: { text: string; hoursToReply: number };
  /** Drafts already produced by an earlier run. */
  drafts?: Array<{
    text: string;
    quality: number;
    rationale: string;
    keyword: string | null;
    selected?: boolean;
    safetyTags?: string[];
  }>;
  approval?: { decision: ReviewApproval["decision"]; notes: string };
}

const REVIEW_SPECS: SeedReviewSpec[] = [
  {
    n: 1,
    source: "google",
    reviewer: "Anna Kowalczyk",
    stars: 5,
    language: "pl",
    daysAgo: 12,
    text: "Najlepsza filtrowana kawa na Kazimierzu. Etiopia z waszego palenia pachnie jak dzem morelowy, a obsluga zawsze doradzi bez zadecia. Siedzialam z ksiazka dwie godziny i nikt mnie nie poganial.",
    status: "published",
    sentiment: "positive",
    riskScore: 4,
    requiresApproval: false,
    published: {
      text: "Dziekujemy, Anno. Ta Etiopia rzeczywiscie ma w sobie duzo moreli, cieszymy sie, ze trafila w gust. Kawa filtrowana to u nas codziennosc, wiec wpadaj po kolejny kubek i po kolejna ksiazke.",
      hoursToReply: 3,
    },
  },
  {
    n: 2,
    source: "google",
    reviewer: "Michal Wieczorek",
    stars: 4,
    language: "pl",
    daysAgo: 10,
    text: "Sernik baskijski swietny, kawa tez. Minus za sobote w porze lunchu, czekalem przy barze jakies dwanascie minut zanim ktos przyjal zamowienie. Poza tym miejsce bardzo klimatyczne.",
    status: "published",
    sentiment: "positive",
    riskScore: 18,
    requiresApproval: false,
    flags: [
      {
        type: "complaint",
        severity: "low",
        evidence: "czekalem przy barze jakies dwanascie minut",
      },
    ],
    published: {
      text: "Dziekujemy za dobre slowo o serniku baskijskim, pieczemy go u siebie codziennie rano. Sobotni lunch faktycznie potrafi nas zalac, pracujemy nad obsada baru w szczycie. Do zobaczenia niedlugo.",
      hoursToReply: 6,
    },
  },
  {
    n: 3,
    source: "google",
    reviewer: "Sophie Lambert",
    stars: 5,
    language: "en",
    daysAgo: 8,
    text: "Found this place while working remotely for a month in Krakow. Reliable wifi, plenty of sockets and the flat white is genuinely excellent. The staff never made me feel guilty for staying a while.",
    status: "approved",
    sentiment: "positive",
    riskScore: 3,
    requiresApproval: false,
    drafts: [
      {
        text: "Thank you, Sophie. Glad the flat white held up over a whole month of remote work, and that the sockets did their job. Come back for a laptop friendly spot in Krakow whenever you need a desk with better coffee.",
        quality: 88,
        rationale:
          "Echoes the remote work detail, one local phrase, soft return invitation.",
        keyword: "a laptop friendly spot in Krakow",
        selected: true,
      },
      {
        text: "Thanks Sophie, this made our morning. The flat white is the drink we obsess over most, and we like knowing the corner desk earned its keep. Come back any time you are in Kazimierz.",
        quality: 81,
        rationale: "Warmer variant with no keyword, kept as a safer fallback.",
        keyword: null,
      },
    ],
    approval: {
      decision: "approved",
      notes: "Good echo of the remote work detail. Nothing to change.",
    },
  },
  {
    n: 4,
    source: "google",
    reviewer: "Tomasz Bak",
    stars: 3,
    language: "pl",
    daysAgo: 6,
    text: "Kawa dobra, ciasto tez, ale muzyka byla tak glosna ze nie dalo sie rozmawiac. Przyszlismy na spokojne popoludnie we dwoje i wyszlismy po pol godziny.",
    status: "pending_approval",
    sentiment: "mixed",
    riskScore: 34,
    requiresApproval: true,
    assignedTo: DEMO_USERS.manager.id,
    flags: [
      {
        type: "complaint",
        severity: "medium",
        evidence: "muzyka byla tak glosna ze nie dalo sie rozmawiac",
      },
    ],
    drafts: [
      {
        text: "Dziekujemy za dobre slowo o kawie i ciescie. Glosna muzyka w sobotnie popoludnie to uwaga, ktora bierzemy na powaznie, sprawdzimy poziom w sali od podworza. Damy rade zrobic wam spokojniejsze popoludnie.",
        quality: 84,
        rationale:
          "Gratitude, acknowledges the specific complaint, no excuse, soft invitation.",
        keyword: null,
        selected: true,
      },
      {
        text: "Dzieki za szczera opinie. Przykro nam, ze muzyka zepsula wam popoludnie, w tygodniu gramy duzo ciszej i wtedy latwiej o rozmowe. Zapraszamy ponownie.",
        quality: 76,
        rationale: "Offers a concrete alternative time. Slightly more defensive.",
        keyword: null,
      },
    ],
  },
  {
    n: 5,
    source: "google",
    reviewer: "Karolina Maj",
    stars: 1,
    language: "pl",
    daysAgo: 3,
    text: "Czekalam 25 minut na latte, ktore przyszlo zimne. Barista Ola zachowala sie opryskliwie, kiedy poprosilam o poprawienie. Nigdy wiecej, a szkoda bo lokal ladny.",
    status: "new",
    sentiment: "negative",
    riskScore: 72,
    requiresApproval: true,
    flags: [
      {
        type: "staff_named",
        severity: "high",
        evidence: "Barista Ola zachowala sie opryskliwie",
      },
      {
        type: "complaint",
        severity: "high",
        evidence: "Czekalam 25 minut na latte, ktore przyszlo zimne",
      },
    ],
  },
  {
    n: 6,
    source: "google",
    reviewer: "Piotr Zajac",
    stars: 2,
    language: "pl",
    daysAgo: 2,
    text: "W kawalku ciasta znalazlem wlos. Zwrocilem uwage przy barze, dostalem tylko przeprosiny i nic wiecej. Higiena w takim miejscu powinna byc podstawa.",
    status: "new",
    sentiment: "negative",
    riskScore: 88,
    requiresApproval: true,
    flags: [
      {
        type: "health_safety",
        severity: "high",
        evidence: "W kawalku ciasta znalazlem wlos",
      },
      {
        type: "complaint",
        severity: "high",
        evidence: "dostalem tylko przeprosiny i nic wiecej",
      },
    ],
  },
  {
    n: 7,
    source: "google",
    reviewer: "Julia Nowicka",
    stars: 5,
    language: "pl",
    daysAgo: 2,
    text: "Polecam!",
    status: "draft_generated",
    sentiment: "positive",
    riskScore: 2,
    requiresApproval: false,
    drafts: [
      {
        text: "Dziekujemy, Julio. Krotko i milo, a nam robi dzien. Kawiarnia przy Placu Nowym to nasz konik, wiec wpadaj na kawe.",
        quality: 71,
        rationale:
          "Nothing specific to echo, so the reply stays short and adds one local anchor.",
        keyword: "kawiarnia przy Placu Nowym",
        selected: false,
      },
    ],
  },
  {
    n: 8,
    source: "tripadvisor",
    reviewer: "David Reid",
    stars: 4,
    language: "en",
    daysAgo: 5,
    text: "Came for brunch on a Sunday. The avocado toast with poached eggs was properly done and the cold brew was a nice surprise. Only complaint is that we waited about twenty minutes for a table.",
    status: "draft_generated",
    sentiment: "positive",
    riskScore: 15,
    requiresApproval: false,
    flags: [
      {
        type: "complaint",
        severity: "low",
        evidence: "we waited about twenty minutes for a table",
      },
    ],
    drafts: [
      {
        text: "Thank you, David. The poached eggs are the part we are most protective of, so that is good to hear. Sunday brunch does build a queue, and reserving ahead usually skips it. See you next time.",
        quality: 86,
        rationale:
          "Echoes the eggs, answers the wait with a practical tip, no excuse.",
        keyword: null,
      },
      {
        text: "Thanks David, glad the cold brew landed. Twenty minutes on a Sunday is longer than we want, we have added a second host during the brunch rush. Come back and let us know if it feels quicker.",
        quality: 79,
        rationale: "Commits to a concrete fix. Slightly longer than target.",
        keyword: null,
      },
    ],
  },
  {
    n: 9,
    source: "google",
    reviewer: null,
    stars: 1,
    language: "pl",
    daysAgo: 4,
    text: "Tragedia. Nie polecam nikomu. Zenada i porazka.",
    status: "new",
    sentiment: "negative",
    riskScore: 66,
    requiresApproval: true,
    flags: [
      {
        type: "likely_fake",
        severity: "medium",
        evidence: "Brak jakiegokolwiek konkretu, konto bez zdjecia i historii",
      },
      {
        type: "unclear_sentiment",
        severity: "low",
        evidence: "Nie wiadomo, czego dotyczy zarzut",
      },
    ],
  },
  {
    n: 10,
    source: "google",
    reviewer: "Ewa Sikora",
    stars: 3,
    language: "pl",
    daysAgo: 7,
    text: "Kawa w porzadku, ale w Kolorze obok robia lepsze cappuccino za te same pieniadze. U was ladniej, u nich smaczniej.",
    status: "new",
    sentiment: "mixed",
    riskScore: 41,
    requiresApproval: true,
    flags: [
      {
        type: "competitor_mention",
        severity: "medium",
        evidence: "w Kolorze obok robia lepsze cappuccino",
      },
    ],
  },
  {
    n: 11,
    source: "google",
    reviewer: "Marek Dudek",
    stars: 1,
    language: "pl",
    daysAgo: 1,
    text: "Zaplacilem za zestaw sniadaniowy, ktorego polowa nie dojechala do stolika. Odmowiono mi zwrotu. Zglaszam sprawe do sanepidu i rzecznika praw konsumenta.",
    status: "pending_approval",
    sentiment: "negative",
    riskScore: 94,
    requiresApproval: true,
    assignedTo: DEMO_USERS.owner.id,
    flags: [
      {
        type: "legal_threat",
        severity: "high",
        evidence: "Zglaszam sprawe do sanepidu i rzecznika praw konsumenta",
      },
      {
        type: "refund_issue",
        severity: "high",
        evidence: "Odmowiono mi zwrotu",
      },
      {
        type: "complaint",
        severity: "high",
        evidence: "polowa nie dojechala do stolika",
      },
    ],
    drafts: [
      {
        text: "Panie Marku, przykro nam, ze zamowienie nie dotarlo w calosci. Chcemy to wyjasnic i uporzadkowac platnosc, prosze o kontakt na kontakt@cafekolektyw.pl albo 12 345 67 89. Odezwiemy sie tego samego dnia.",
        quality: 90,
        rationale:
          "One apology, no admission of fault, no public refund talk, straight to a private channel.",
        keyword: null,
        selected: true,
        safetyTags: ["no_public_refund", "escalation_contact", "no_admission"],
      },
    ],
  },
  {
    n: 12,
    source: "facebook",
    reviewer: "Nina Petrova",
    stars: 5,
    language: "en",
    daysAgo: 15,
    text: "The garden at the back is the best kept secret in Kazimierz. They brought a water bowl for my dog without me asking. Cortado was spot on too.",
    status: "published",
    sentiment: "positive",
    riskScore: 2,
    requiresApproval: false,
    published: {
      text: "Thank you, Nina. The water bowl is standard here, dogs are regulars in the garden. Glad the cortado kept up. See you and your companion soon.",
      hoursToReply: 5,
    },
  },
  {
    n: 13,
    source: "google",
    reviewer: "Lukasz Frankowski",
    stars: 4,
    language: "pl",
    daysAgo: 20,
    text: "Przychodze tu popracowac dwa razy w tygodniu. Wifi stabilne, gniazdka przy kazdym stoliku pod oknem. Jedyne co, to czasem brakuje miejsca po 11.",
    status: "published",
    sentiment: "positive",
    riskScore: 9,
    requiresApproval: false,
    published: {
      text: "Dzieki, Lukaszu. Stoliki pod oknem z gniazdkami trzymamy wlasnie dla takich poranków. Po jedenastej robi sie tloczno, wtedy zwykle zwalnia sie antresola. Do zobaczenia w przyszlym tygodniu.",
      hoursToReply: 9,
    },
  },
  {
    n: 14,
    source: "google",
    reviewer: "Hanna Tomczyk",
    stars: 5,
    language: "pl",
    daysAgo: 1,
    text: "Zamowilam u was tort na urodziny corki i wyszedl dokladnie taki, jak na zdjeciu, ktore przyslalam. Dzieciaki zjadly wszystko co do okruszka.",
    status: "new",
    sentiment: "positive",
    riskScore: 2,
    requiresApproval: false,
  },
];

const KEYWORDS: Array<[string, KeywordBankItem["type"], boolean, number]> = [
  ["kawiarnia na Kazimierzu", "local", true, 6],
  ["kawa speciality w Krakowie", "service", true, 4],
  ["sniadania na Kazimierzu", "service", true, 3],
  ["a laptop friendly spot in Krakow", "service", true, 2],
  ["kawa filtrowana", "product", true, 5],
  ["sernik baskijski", "product", true, 3],
  ["ogrod w kamienicy przy Jozefa", "local", true, 1],
  ["kawiarnia przy Placu Nowym", "local", true, 2],
  ["brunch in Kazimierz", "service", true, 1],
  ["palarnia kawy", "brand", false, 0],
];

const BRAND_VOICE: Array<[BrandVoiceExample["exampleType"], string]> = [
  [
    "positive_reply",
    "Dziekujemy, Anno. Ta Etiopia rzeczywiscie ma w sobie duzo moreli, cieszymy sie, ze trafila w gust. Wpadaj po kolejny kubek.",
  ],
  [
    "positive_reply",
    "Thank you, Sophie. Glad the flat white held up over a whole month of remote work. The corner desk is yours whenever you are back.",
  ],
  [
    "neutral_reply",
    "Dziekujemy za szczera opinie. Kolejka w sobote to nasz slaby punkt i pracujemy nad obsada. Damy rade zrobic to lepiej.",
  ],
  [
    "negative_reply",
    "Przykro nam, ze wizyta wygladala tak, jak opisujesz. Chcemy to wyjasnic osobiscie, prosze o kontakt na kontakt@cafekolektyw.pl.",
  ],
  ["tone_descriptor", "Warm but never sugary. We sound like a person, not a brand."],
  ["tone_descriptor", "Short sentences. No corporate filler."],
  ["phrase_to_prefer", "Dzieki za te slowa"],
  ["phrase_to_prefer", "Wpadaj"],
  ["phrase_to_avoid", "Drogi Kliencie"],
  ["phrase_to_avoid", "Panstwa opinia jest dla nas bardzo wazna"],
];

export function buildSeedDataset(now = Date.now()): DemoDataset {
  const createdAt = iso(90 * DAY, now);

  const tenants: Tenant[] = [
    {
      id: DEMO_TENANT_ID,
      name: "Cafe Kolektyw",
      slug: "cafe-kolektyw",
      plan: "growth",
      createdAt,
    },
  ];

  const profiles: Profile[] = Object.values(DEMO_USERS).map((user) => ({
    id: `profile-${user.id}`,
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    avatarInitials: user.initials,
    createdAt,
  }));

  const members: TenantMember[] = Object.values(DEMO_USERS).map(
    (user, index) => ({
      id: id("member", index + 1),
      tenantId: DEMO_TENANT_ID,
      userId: user.id,
      role: user.role,
      jobTitle: user.jobTitle,
      createdAt,
    }),
  );

  const businessProfiles: BusinessProfile[] = [
    {
      id: DEMO_BUSINESS_PROFILE_ID,
      tenantId: DEMO_TENANT_ID,
      name: "Cafe Kolektyw",
      category: "cafe",
      city: "Krakow",
      district: "Kazimierz",
      address: "ul. Jozefa 18, 31-056 Krakow",
      description:
        "Speciality coffee bar and bakery in a tenement courtyard on Jozefa. Own filter brews, baskijski cheesecake baked every morning, a garden at the back and desks that people actually work from.",
      tone: "warm_professional",
      toneDescriptors: ["warm", "specific", "unfussy", "never corporate"],
      signOff: "Zespol Cafe Kolektyw",
      negativePolicy:
        "One apology, never two. Name the problem in the reviewer's own words. Move anything about money, staff or hygiene to email or phone within the first two sentences. Never blame a shift, a supplier or the customer.",
      escalationEmail: "kontakt@cafekolektyw.pl",
      escalationPhone: "+48 12 345 67 89",
      bannedPhrases: [
        "Drogi Kliencie",
        "Panstwa opinia jest dla nas bardzo wazna",
        "Dear Customer",
        "We apologise for any inconvenience caused",
        "najlepsza kawa w Krakowie",
      ],
      preferredWords: ["wpadaj", "dzieki za te slowa", "do zobaczenia"],
      doNotMention: [
        "ceny konkurencji",
        "imiona pracownikow",
        "rabaty i vouchery",
        "sprawy sadowe",
      ],
      languages: ["pl", "en"],
      primaryLanguage: "pl",
      approvalSettings: {
        autoApproveMinStars: 5,
        requireApprovalWhenRiskFlagged: true,
        draftsPerGeneration: 2,
        requireApprovalBeforePublish: true,
      },
      createdAt,
      updatedAt: iso(4 * DAY, now),
    },
  ];

  const keywordItems: KeywordBankItem[] = KEYWORDS.map(
    ([phrase, type, active, usageCount], index) => ({
      id: id("kw", index + 1),
      businessProfileId: DEMO_BUSINESS_PROFILE_ID,
      phrase,
      type,
      active,
      usageCount,
      createdAt,
    }),
  );

  const brandVoiceExamples: BrandVoiceExample[] = BRAND_VOICE.map(
    ([exampleType, content], index) => ({
      id: id("voice", index + 1),
      businessProfileId: DEMO_BUSINESS_PROFILE_ID,
      exampleType,
      content,
      createdAt,
    }),
  );

  const reviews: Review[] = [];
  const riskFlags: ReviewRiskFlag[] = [];
  const drafts: ReviewDraft[] = [];
  const approvals: ReviewApproval[] = [];
  const activity: ActivityLog[] = [];

  for (const spec of REVIEW_SPECS) {
    const reviewId = id("review", spec.n);
    const reviewedAt = iso(spec.daysAgo * DAY, now);
    const publishedAt = spec.published
      ? iso(spec.daysAgo * DAY - spec.published.hoursToReply * HOUR, now)
      : null;

    reviews.push({
      id: reviewId,
      tenantId: DEMO_TENANT_ID,
      businessProfileId: DEMO_BUSINESS_PROFILE_ID,
      source: spec.source,
      externalId: spec.source === "manual" ? null : `ext-${reviewId}`,
      reviewerName: spec.reviewer,
      stars: spec.stars,
      reviewText: spec.text,
      language: spec.language,
      sentiment: spec.sentiment,
      riskScore: spec.riskScore,
      status: spec.status,
      requiresApproval: spec.requiresApproval,
      assignedTo: spec.assignedTo ?? null,
      publishedReply: spec.published?.text ?? null,
      publishedAt,
      reviewedAt,
      createdAt: reviewedAt,
      updatedAt: publishedAt ?? reviewedAt,
    });

    spec.flags?.forEach((flag, index) => {
      riskFlags.push({
        id: `${reviewId}-flag-${index + 1}`,
        reviewId,
        flagType: flag.type,
        severity: flag.severity,
        evidence: flag.evidence,
        createdAt: reviewedAt,
      });
    });

    const draftBaseline = iso(spec.daysAgo * DAY - 2 * HOUR, now);
    spec.drafts?.forEach((draft, index) => {
      drafts.push({
        id: `${reviewId}-draft-${index + 1}`,
        reviewId,
        model: "mock-reply-v1",
        promptVersion: "2026.08.1",
        draftText: draft.text,
        qualityScore: draft.quality,
        selected: draft.selected ?? false,
        rationale: draft.rationale,
        safetyTags: draft.safetyTags ?? [],
        keywordUsed: draft.keyword,
        editedFromDraftId: null,
        createdBy: DEMO_USERS.manager.id,
        createdAt: draftBaseline,
      });
    });

    if (spec.published) {
      drafts.push({
        id: `${reviewId}-draft-published`,
        reviewId,
        model: "mock-reply-v1",
        promptVersion: "2026.08.1",
        draftText: spec.published.text,
        qualityScore: 92,
        selected: true,
        rationale: "Published reply, kept for audit.",
        safetyTags: [],
        keywordUsed: null,
        editedFromDraftId: null,
        createdBy: DEMO_USERS.manager.id,
        createdAt: draftBaseline,
      });
      approvals.push({
        id: `${reviewId}-approval-1`,
        reviewId,
        draftId: `${reviewId}-draft-published`,
        decision: "approved",
        approvedBy: DEMO_USERS.owner.id,
        notes: null,
        createdAt: publishedAt ?? reviewedAt,
      });
      activity.push({
        id: `${reviewId}-activity-published`,
        tenantId: DEMO_TENANT_ID,
        actorUserId: DEMO_USERS.owner.id,
        actorName: DEMO_USERS.owner.fullName,
        entityType: "review",
        entityId: reviewId,
        action: "review.published",
        metadata: { stars: spec.stars, source: spec.source },
        createdAt: publishedAt ?? reviewedAt,
      });
    }

    if (spec.approval) {
      approvals.push({
        id: `${reviewId}-approval-1`,
        reviewId,
        draftId: `${reviewId}-draft-1`,
        decision: spec.approval.decision,
        approvedBy: DEMO_USERS.owner.id,
        notes: spec.approval.notes,
        createdAt: draftBaseline,
      });
      activity.push({
        id: `${reviewId}-activity-approved`,
        tenantId: DEMO_TENANT_ID,
        actorUserId: DEMO_USERS.owner.id,
        actorName: DEMO_USERS.owner.fullName,
        entityType: "review",
        entityId: reviewId,
        action: "review.approved",
        metadata: { notes: spec.approval.notes },
        createdAt: draftBaseline,
      });
    }

    if (spec.drafts?.length) {
      activity.push({
        id: `${reviewId}-activity-drafted`,
        tenantId: DEMO_TENANT_ID,
        actorUserId: DEMO_USERS.manager.id,
        actorName: DEMO_USERS.manager.fullName,
        entityType: "review_draft",
        entityId: reviewId,
        action: "draft.generated",
        metadata: { count: spec.drafts.length, model: "mock-reply-v1" },
        createdAt: draftBaseline,
      });
    }

    activity.push({
      id: `${reviewId}-activity-created`,
      tenantId: DEMO_TENANT_ID,
      actorUserId: null,
      actorName: "Review sync",
      entityType: "review",
      entityId: reviewId,
      action: "review.created",
      metadata: { source: spec.source, stars: spec.stars },
      createdAt: reviewedAt,
    });
  }

  activity.push(
    {
      id: "activity-profile-updated",
      tenantId: DEMO_TENANT_ID,
      actorUserId: DEMO_USERS.owner.id,
      actorName: DEMO_USERS.owner.fullName,
      entityType: "business_profile",
      entityId: DEMO_BUSINESS_PROFILE_ID,
      action: "business_profile.updated",
      metadata: { fields: ["negativePolicy", "bannedPhrases"] },
      createdAt: iso(4 * DAY, now),
    },
    {
      id: "activity-keywords-updated",
      tenantId: DEMO_TENANT_ID,
      actorUserId: DEMO_USERS.owner.id,
      actorName: DEMO_USERS.owner.fullName,
      entityType: "keyword_bank",
      entityId: DEMO_BUSINESS_PROFILE_ID,
      action: "keyword_bank.updated",
      metadata: { added: ["brunch in Kazimierz"] },
      createdAt: iso(9 * DAY, now),
    },
  );

  activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    tenants,
    profiles,
    members,
    businessProfiles,
    keywordItems,
    brandVoiceExamples,
    reviews,
    riskFlags,
    drafts,
    approvals,
    activity,
  };
}
