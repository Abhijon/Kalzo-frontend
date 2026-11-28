/** Preset rating tags — keep in sync with Kalzo done-screen TAGS in logic.js */
export const REVIEW_TAGS = [
  "Professional",
  "Punctual",
  "A fine performance",
  "Commands the room",
  "Good value",
] as const;

export type ReviewTag = (typeof REVIEW_TAGS)[number];

export function collectReviewTags(
  selected: Record<string, boolean>,
  customTag: string,
): string[] {
  const preset = Object.keys(selected).filter((k) => selected[k]);
  const custom = customTag.trim().replace(/\s+/g, " ").slice(0, 40);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...preset, ...(custom ? [custom] : [])]) {
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 12) break;
  }
  return out;
}
