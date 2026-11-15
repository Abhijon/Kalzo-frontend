export const offPlatformContact = (body: string) =>
  /(?:\+?\d[\s-]*){10,}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|wa\.me|whatsapp|pay\s*(?:me|direct)/i.test(
    body,
  );
export const isFutureMeeting = (eventAt: string, now: number) => new Date(eventAt).getTime() > now;
