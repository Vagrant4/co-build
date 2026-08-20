"use client";

import { useActionState, useEffect } from "react";
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

  useEffect(() => {
    if (state.redirectTo) router.push(state.redirectTo);
  }, [router, state.redirectTo]);

  return (
    <form action={formAction} className={className}>
      {children}
      {state.error ? <p className="form-action-message form-action-message--error" role="alert">{state.error}</p> : null}
      {state.success ? <p className="form-action-message" role="status">{state.success}</p> : null}
    </form>
  );
}
