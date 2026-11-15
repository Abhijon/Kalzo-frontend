export type BookingGroup = "current" | "upcoming" | "past";
const LIVE = new Set(["arrived", "performing", "finished", "venue_verified", "in_progress"]);
const DONE = new Set(["completed", "cancelled", "rejected", "declined", "expired"]);
/** Current = happening today or artist on stage; past = finished/cancelled or date gone; else upcoming. */
export function bookingGroup(b: { event_date: string; workflow_stage: string }, today: string): BookingGroup {
  if (DONE.has(b.workflow_stage)) return "past";
  if (LIVE.has(b.workflow_stage) || b.event_date === today) return "current";
  return b.event_date < today ? "past" : "upcoming";
}
