"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type FormActionState = {
  error?: string;
  success?: string;
  redirectTo?: string;
};

export function ActionForm({
  action,
  children,
  className
}: {
  action: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {});
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (state.redirectTo) router.push(state.redirectTo);
  }, [router, state.redirectTo]);

  useEffect(() => {
    if (!state.success) return;
    setShowSuccess(true);
    const timeout = window.setTimeout(() => setShowSuccess(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [state.success]);

  return (
    <form action={formAction} className={className}>
      {children}
      {state.error ? <p className="form-action-message form-action-message--error" role="alert">{state.error}</p> : null}
      {state.success && showSuccess ? <p className="form-action-message" role="status">{state.success}</p> : null}
    </form>
  );
}
