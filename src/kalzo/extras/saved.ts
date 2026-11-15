export type SavedList = "look" | "book";
export type SavedMap = Record<string, SavedList>;

// Tapping the same mark twice clears it, so one button both saves and un-saves.
export function nextSaved(cur: SavedMap, id: string, want: SavedList): SavedMap {
  const out: SavedMap = { ...cur };
  if (out[id] === want) delete out[id];
  else out[id] = want;
  return out;
}

export function savedCounts(cur: SavedMap) {
  const ids = Object.keys(cur);
  return {
    total: ids.length,
    look: ids.filter((i) => cur[i] === "look").length,
    book: ids.filter((i) => cur[i] === "book").length,
  };
}
