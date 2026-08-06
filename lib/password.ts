const WORDS = [
  "kawa",
  "brunch",
  "ogrod",
  "rynek",
  "wisla",
  "sernik",
  "bursztyn",
  "latarnia",
  "kamienica",
  "poranek",
];

/**
 * Readable rather than clever. A handover password gets typed by a human at
 * least once, and gets replaced by the client right after.
 */
export function suggestPassword(): string {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  return `${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 8999)}`;
}
