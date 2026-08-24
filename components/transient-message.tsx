"use client";

import { useEffect, useState } from "react";

export function TransientMessage({ children, className, timeoutMs = 3000 }: { children: React.ReactNode; className: string; timeoutMs?: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setVisible(false);
      const url = new URL(window.location.href);
      ["approvalError", "listingUpdate", "uploadRemediation", "pilotPayment"].forEach((key) => url.searchParams.delete(key));
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }, timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [timeoutMs]);

  return visible ? <div className={className}>{children}</div> : null;
}
