type ResendDomain = { id?: string; name?: string; status?: string; region?: string };

async function main() {
  const apiKey = required("RESEND_API_KEY");
  const sender = required("TRANSACTIONAL_EMAIL_FROM");
  const domain = senderDomain(sender);
  const response = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}`, "User-Agent": "co-build-email-readiness/1.0" },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`Resend domain verification failed with HTTP ${response.status}.`);
  const payload = await response.json() as { data?: ResendDomain[] };
  const configured = payload.data?.find((candidate) => candidate.name?.toLowerCase() === domain);
  if (!configured) throw new Error(`The sender domain ${domain} is not configured in Resend.`);
  if (configured.status?.toLowerCase() !== "verified") throw new Error(`The sender domain ${domain} is not verified in Resend.`);
  console.log(JSON.stringify({ provider: "resend", senderDomain: domain, status: "verified", region: configured.region || "unspecified" }, null, 2));
}

export function senderDomain(sender: string): string {
  const match = sender.match(/<([^<>]+)>\s*$/);
  const email = (match?.[1] || sender).trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) throw new Error("TRANSACTIONAL_EMAIL_FROM must contain a valid email address.");
  return email.slice(at + 1);
}

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Email provider verification failed.");
  process.exitCode = 1;
});
