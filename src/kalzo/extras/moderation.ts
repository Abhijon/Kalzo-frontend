// Flags attempts to move a deal or contact details off Kalzo.
const RULES: [RegExp, string][] = [
  [/(\+?91[\s-]?)?[6-9](\D?\d){9}/, "phone number"],
  [/[\w.+-]+@[\w-]+\.\w+/, "email address"],
  [/\b(whats\s?app|wa\.me|telegram|insta(gram)?|dm me|signal)\b/i, "outside app"],
  [/\b(g\s?pay|phone\s?pe|paytm|upi id|cash|bank transfer|neft)\b/i, "outside payment"],
  [/\b(offline|outside (of )?(kalzo|the app|this)|directly|separately|after this call|my number|your number|personal number|call me on)\b/i, "off-platform deal"],
];
export function checkMessage(text: string): string | null {
  for (const [re, why] of RULES as [RegExp, string][]) if (re.test(text)) return why;
  return null;
}
