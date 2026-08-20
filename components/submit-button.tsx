"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "button-primary",
  pendingLabel = "Working...",
  disabled = false,
  name,
  value
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={disabled || pending} name={name} value={value}>
      {pending ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
