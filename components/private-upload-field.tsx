"use client";

import { upload } from "@vercel/blob/client";
import type { UploadType } from "@prisma/client";
import { CheckCircle2, FileUp, LoaderCircle, ShieldAlert } from "lucide-react";
import { useState } from "react";

type Props = {
  label: string;
  name: string;
  type: UploadType;
  accept: string;
  bookingId?: string;
  listingId?: string;
  required?: boolean;
};

export function PrivateUploadField({ label, name, type, accept, bookingId, listingId, required = false }: Props) {
  const [uploadId, setUploadId] = useState("");
  const [state, setState] = useState<"idle" | "uploading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleFile(file: File | undefined) {
    setUploadId("");
    if (!file) return setState("idle");
    setState("uploading");
    setMessage("Reserving private upload...");
    try {
      const reservationResponse = await fetch("/api/uploads/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, originalName: file.name, contentType: file.type, sizeBytes: file.size, bookingId, listingId })
      });
      const reservation = await reservationResponse.json() as { uploadId?: string; objectKey?: string; error?: string };
      if (!reservationResponse.ok || !reservation.uploadId || !reservation.objectKey) throw new Error(reservation.error || "Upload could not be reserved.");
      setMessage("Uploading directly to private storage...");
      await upload(reservation.objectKey, file, {
        access: "private",
        handleUploadUrl: "/api/uploads/authorize",
        clientPayload: JSON.stringify({ uploadId: reservation.uploadId }),
        contentType: file.type
      });
      await waitUntilAvailable(reservation.uploadId);
      setUploadId(reservation.uploadId);
      setState("ready");
      setMessage("Private upload ready");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Private upload failed.");
    }
  }

  return (
    <label className="grid gap-2 text-sm font-bold">
      <span>{label}</span>
      <span className="relative flex min-h-12 items-center gap-3 border border-neutral-300 bg-white px-3 py-2">
        {state === "uploading" ? <LoaderCircle className="h-5 w-5 animate-spin text-orange-600" /> : state === "ready" ? <CheckCircle2 className="h-5 w-5 text-emerald-700" /> : state === "error" ? <ShieldAlert className="h-5 w-5 text-red-700" /> : <FileUp className="h-5 w-5 text-neutral-600" />}
        <input className="min-w-0 flex-1 text-sm" type="file" accept={accept} required={required && !uploadId} onChange={(event) => void handleFile(event.target.files?.[0])} />
      </span>
      <input type="hidden" name={`${name}UploadId`} value={uploadId} />
      {message ? <span className={state === "error" ? "text-xs text-red-700" : "text-xs text-neutral-600"}>{message}</span> : null}
    </label>
  );
}

async function waitUntilAvailable(uploadId: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`/api/uploads/${uploadId}/status`, { cache: "no-store" });
    const result = await response.json() as { uploadStatus?: string; error?: string };
    if (!response.ok) throw new Error(result.error || "Upload status could not be checked.");
    if (result.uploadStatus === "AVAILABLE") return;
    if (result.uploadStatus === "REJECTED" || result.uploadStatus === "DELETED") throw new Error("File was rejected by server validation.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Upload validation timed out. Try again.");
}
