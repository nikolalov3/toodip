import { categoryLabels, toneLabels } from "@/lib/labels";
import type {
  BrandVoiceExample,
  BusinessProfile,
  KeywordBankItem,
} from "@/types/domain";

/**
 * Layer 2 of the prompt: who this business is and how it is allowed to sound.
 * Built entirely from tenant data, so it is identical for every review of that
 * tenant and can be cached.
 */

export interface TenantPromptInput {
  profile: BusinessProfile;
  keywords: KeywordBankItem[];
  brandVoice: BrandVoiceExample[];
}

function bullets(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

const EMOJI_RULES: Record<BusinessProfile["emojiPolicy"], string> = {
  never: "never use an emoji, in any reply.",
  sparing:
    "at most one emoji, only in a genuinely warm reply to a happy customer. Never in a reply to a complaint, a neutral review or anything carrying a risk flag.",
  match_reviewer:
    "use an emoji only if the reviewer used one first, and then at most one. Never in a reply to a complaint or a flagged review.",
};

export function buildTenantPrompt({
  profile,
  keywords,
  brandVoice,
}: TenantPromptInput): string {
  const activeKeywords = keywords.filter((item) => item.active);
  const examples = brandVoice.filter((item) =>
    item.exampleType.endsWith("_reply"),
  );
  const descriptors = brandVoice.filter(
    (item) => item.exampleType === "tone_descriptor",
  );
  const prefer = brandVoice.filter(
    (item) => item.exampleType === "phrase_to_prefer",
  );
  const avoid = brandVoice.filter(
    (item) => item.exampleType === "phrase_to_avoid",
  );

  const location = [profile.district, profile.city]
    .filter(Boolean)
    .join(", ");

  return `BUSINESS
Name: ${profile.name}
Category: ${categoryLabels[profile.category]}
Location: ${location}
About: ${profile.description}

VOICE
Tone: ${toneLabels[profile.tone]}
Descriptors: ${[...profile.toneDescriptors, ...descriptors.map((d) => d.content)].join(", ") || "none"}
Emoji: ${EMOJI_RULES[profile.emojiPolicy]}
Sign off: ${profile.signOff || "none, end on the last sentence"}
Reply language: ${profile.primaryLanguage} by default, mirror the reviewer when the review is in ${profile.languages.join(" or ")}.

PHRASES TO PREFER
${bullets([...profile.preferredWords, ...prefer.map((item) => item.content)])}

BANNED PHRASES, never use these or close variants
${bullets([...profile.bannedPhrases, ...avoid.map((item) => item.content)])}

NEVER MENTION
${bullets(profile.doNotMention)}

KEYWORD BANK, use at most one and only if it fits naturally
${bullets(
  activeKeywords.map(
    (item) => `${item.phrase} (${item.type}, used ${item.usageCount} times)`,
  ),
)}
Prefer a phrase with a low usage count. Skip the bank entirely rather than force a phrase.

NEGATIVE REVIEW POLICY
${profile.negativePolicy}
Private contact for escalation: ${profile.escalationEmail ?? "not set"}${
    profile.escalationPhone ? ` or ${profile.escalationPhone}` : ""
  }

REPLIES THIS BUSINESS ALREADY APPROVED, match this register
${
  examples.length
    ? examples.map((item) => `"${item.content}"`).join("\n")
    : "none yet"
}`;
}
