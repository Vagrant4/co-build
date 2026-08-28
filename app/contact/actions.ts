"use server";

import type { FormActionState } from "@/components/action-form";

const TOPICS = new Set(["Rent a space", "List a space", "High-risk work approval", "Deposit or dispute"]);

export async function sendContactInquiryAction(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  const name = field(formData, "name", 100);
  const email = field(formData, "email", 254).toLowerCase();
  const topic = field(formData, "topic", 80);
  const message = field(formData, "message", 2000);
  if (!name || !email || !message) return { error: "Complete your name, email, and message." };
  if (!/^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u.test(name)) return { error: "Enter a valid name using letters and standard punctuation." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (!TOPICS.has(topic)) return { error: "Select a valid enquiry topic." };

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TRANSACTIONAL_EMAIL_FROM?.trim();
  const to = process.env.SUPPORT_CONTACT_EMAIL?.trim() || process.env.OPERATIONS_OWNER_EMAIL?.trim();
  if (!apiKey || !from || !to) return { error: "Enquiries are temporarily unavailable. Email support@spaceoncall.com instead." };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        replyTo: email,
        subject: `SpaceOnCall enquiry: ${topic}`,
        text: [`Name: ${name}`, `Reply email: ${email}`, `Topic: ${topic}`, "", message].join("\n")
      })
    });
    if (!response.ok) throw new Error(`RESEND_${response.status}`);
    return { success: "Your enquiry was sent. Operations will reply by email." };
  } catch {
    return { error: "The enquiry could not be sent. Please try again or email support@spaceoncall.com." };
  }
}

function field(formData: FormData, key: string, maximum: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}
