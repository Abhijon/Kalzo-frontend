export function invitationDeadline(sentAt: string, now = Date.now()) {
  const age = now - Date.parse(sentAt);
  return age >= 30 * 60_000 ? "expired" : age >= 25 * 60_000 ? "reminder" : "waiting";
}