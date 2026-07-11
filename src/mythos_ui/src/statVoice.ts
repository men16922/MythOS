// Stat-voice inner-monologue markers appear in the SERVER narration as
// `(<stat>: ...)`, where <stat> is Korean (ko narration) or English (en). The
// quoted line inside/after them is INNER MONOLOGUE — a stat check's voice — NOT
// spoken dialogue. This is the single source of truth for the stat name list so
// the StoryPanel renderer (which styles these) and the dialogue segmenter (which
// must NOT split their quotes out) agree. Before this was shared, the dialogue
// segmenter pulled the quote out of `(관측: "…")`, leaving an empty `(관측: "")`
// shell and mis-attributing the line to a nearby character's portrait.
export const STAT_CANON: Record<
  string,
  "strength" | "intelligence" | "charisma" | "agility" | "perception"
> = {
  "근력": "strength", "Strength": "strength",
  // The stat-voice directive emits "Intelligence"/"Perception"; keep the older
  // "Intellect"/"Observation" spellings as aliases so either still styles/icons.
  "지능": "intelligence", "Intellect": "intelligence", "Intelligence": "intelligence",
  "매력": "charisma", "Charisma": "charisma",
  "민첩": "agility", "Agility": "agility",
  "관측": "perception", "Observation": "perception", "Perception": "perception",
};

export const STAT_NAMES = Object.keys(STAT_CANON).join("|");

// Index ranges [start, end) of a paragraph covered by a stat-voice marker. Uses
// the SAME three patterns StoryPanel renders (complex "(stat: N) … "line"",
// simple "(stat: …)", and the line-start "stat: …" format drift) so whatever the
// renderer treats as a stat voice is exactly what the dialogue segmenter skips.
export function statVoiceRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const patterns = [
    new RegExp(`\\((${STAT_NAMES}):\\s*(\\d+)\\)([^"]*?)("[^"]+")`, "g"),
    new RegExp(`\\((${STAT_NAMES}):\\s*([^)]+)\\)`, "g"),
    new RegExp(`(?:^|\\n)[ \\t]*(${STAT_NAMES}):[ \\t]*([^\\n]+)`, "g"),
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      ranges.push([m.index, m.index + m[0].length]);
    }
  }
  return ranges;
}

export function inStatVoiceRange(pos: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([start, end]) => pos >= start && pos < end);
}
