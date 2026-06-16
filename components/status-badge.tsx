import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const Icon = normalized.includes("approved") || normalized.includes("paid") || normalized.includes("checked")
    ? CheckCircle2
    : normalized.includes("reject") || normalized.includes("suspend")
      ? XCircle
      : normalized.includes("admin") || normalized.includes("risk")
        ? AlertTriangle
        : Clock3;

  return (
    <span className="status-pill">
      <Icon size={14} aria-hidden="true" />
      {status.replaceAll("_", " ")}
    </span>
  );
}
