import { bookingGroup, isAcceptedBooking } from "./flowRules";
export function matchesBookingView(b: { workflow_stage: string; status: string; event_at: string | null; event_date: string }, filter: string) {
  if (filter === "all") return true;
  if (filter === "awaiting") return b.status === "paid" && b.workflow_stage === "paid";
  if (filter === "completed") return b.workflow_stage === "completed";
  if (filter === "current") return b.status === "paid" && isAcceptedBooking(b.workflow_stage);
  return bookingGroup(b) === filter;
}