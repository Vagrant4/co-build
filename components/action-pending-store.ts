"use client";

let pendingActions = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function beginPendingAction(): () => void {
  pendingActions += 1;
  emit();
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    pendingActions = Math.max(0, pendingActions - 1);
    emit();
  };
}

export function subscribeToPendingActions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasPendingAction(): boolean {
  return pendingActions > 0;
}
