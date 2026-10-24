/**
 * TEMPORARY MODULE — "Survey" for Café Belmont only.
 *
 * Shows the answers to the "How did you find us?" popup on belmont.cafe/visit.
 * The popup sends one toodip event per answer (names start with "ankieta").
 * Free text typed under "Other" rides in the event name after a colon
 * ("ankieta-inne:Reddit"), so no database change is needed (40 chars max).
 *
 * To remove it later:
 *   1. delete this file, services/survey.ts and app/(workspace)/survey/
 *   2. delete every line marked `survey-module` (nav, layout, shell, sidebar,
 *      mobile-nav, services/stats.ts)
 */

/** stats_websites.id of belmont.cafe (the data-id in its tracker snippet). */
export const SURVEY_SITE_ID = "0c511152-cd70-41dc-961c-f5704fdab10f";

export const SURVEY_MODULE = "survey";

/** Every survey event name starts with this. */
export const SURVEY_PREFIX = "ankieta";

export function isSurvey(name: string | null | undefined): boolean {
  return (name ?? "").startsWith(SURVEY_PREFIX);
}

export interface SurveyOption {
  /** Event name sent by the popup. */
  event: string;
  label: string;
}

/** In the order shown in the popup. */
export const SURVEY_OPTIONS: SurveyOption[] = [
  { event: "ankieta-maps", label: "Google Maps" },
  { event: "ankieta-ai", label: "ChatGPT / Gemini / AI" },
  { event: "ankieta-social", label: "Our Instagram / TikTok" },
  { event: "ankieta-polecenie-social", label: "Recommended on social media" },
  { event: "ankieta-obok", label: "Walked past" },
  { event: "ankieta-poprzedni", label: "Knew us from the previous place" },
  { event: "ankieta-znajomy", label: "A friend told me" },
  { event: "ankieta-inne", label: "Other" },
];

/** "ankieta-inne:Reddit" -> { event: "ankieta-inne", text: "Reddit" } */
export function parseSurveyName(name: string): { event: string; text: string } {
  const i = name.indexOf(":");
  if (i === -1) return { event: name, text: "" };
  return { event: name.slice(0, i), text: name.slice(i + 1).trim() };
}
