"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { beginPendingAction, hasPendingAction, subscribeToPendingActions } from "./action-pending-store";

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
  const anyActionPending = useSyncExternalStore(subscribeToPendingActions, hasPendingAction, () => false);

  useEffect(() => {
    if (!pending) return;
    return beginPendingAction();
  }, [pending]);

  return (
    <button className={className} type="submit" disabled={disabled || pending || anyActionPending} name={name} value={value}>
      {pending ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
