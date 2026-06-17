export const CONTACT_POLICY_MESSAGE =
  "Keep all communication inside Co-Build chat. Do not share mobile numbers, email addresses, WhatsApp/Telegram handles, or other direct contact details.";

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phonePattern = /(?:\+?\d[\s().-]*){7,}/;
const directContactPatterns = [
  /\bwhats\s*app\b/i,
  /\btelegram\b/i,
  /\bwechat\b/i,
  /\bsignal\b/i,
  /\bcall\s+me\b/i,
  /\btext\s+me\b/i,
  /\bsms\b/i,
  /\bemail\s+me\b/i,
  /\bdm\s+me\b/i,
  /\bcontact\s+me\b/i,
  /\bmy\s+(mobile|phone|number|email|contact)\b/i
];

export function containsRestrictedContactDetail(message: string): boolean {
  return emailPattern.test(message) || phonePattern.test(message) || directContactPatterns.some((pattern) => pattern.test(message));
}
