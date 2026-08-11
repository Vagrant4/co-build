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
  maxFiles?: number;
};

export function PrivateUploadField({ label, name, type, accept, bookingId, listingId, required = false, maxFiles = 1 }: Props) {
  const [uploadIds, setUploadIds] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "uploading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleFiles(files: File[]) {
    setUploadIds([]);
    if (files.length === 0) return setState("idle");
    if (files.length > maxFiles) {
      setState("error");
      return setMessage(`Choose no more than ${maxFiles} file${maxFiles === 1 ? "" : "s"}.`);
    }
    const maximumSizeMiB = type === "FLOOR_PLAN" ? 15 : ["CHECK_IN", "CHECK_OUT", "LISTING_PHOTO"].includes(type) ? 12 : 10;
    const maximumSize = maximumSizeMiB * 1024 * 1024;
    if (files.some((file) => !accept.split(",").includes(file.type))) {
      setState("error");
      return setMessage("Unsupported file type. Choose JPG, PNG, WebP, or PDF where permitted.");
    }
    if (files.some((file) => file.size > maximumSize)) {
      setState("error");
      return setMessage(`A file is too large. Maximum size is ${maximumSizeMiB} MB per file.`);
    }
    setState("uploading");
    setMessage(`Uploading and checking ${files.length} file${files.length === 1 ? "" : "s"}. This usually takes 10-30 seconds...`);
    try {
      const ids = await Promise.all(files.map((file) => uploadFile(file, { type, bookingId, listingId })));
      setUploadIds(ids);
      setState("ready");
      setMessage(files.length === 1 ? `${files[0].name} is ready` : `${files.length} workspace photos are ready`);
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
        <input
          className="min-w-0 flex-1 text-sm"
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          required={required && uploadIds.length === 0}
          onClick={(event) => { event.currentTarget.value = ""; }}
          onChange={(event) => void handleFiles(Array.from(event.target.files ?? []))}
        />
      </span>
      {uploadIds.map((uploadId) => <input key={uploadId} type="hidden" name={`${name}UploadId`} value={uploadId} />)}
      {message ? <span className={state === "error" ? "text-xs text-red-500" : "text-xs text-neutral-500"}>{message}</span> : null}
    </label>
  );
}

async function uploadFile(file: File, context: { type: UploadType; bookingId?: string; listingId?: string }): Promise<string> {
  const reservationResponse = await fetch("/api/uploads/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: context.type, originalName: file.name, contentType: file.type, sizeBytes: file.size, bookingId: context.bookingId, listingId: context.listingId })
  });
  const reservation = await reservationResponse.json() as { uploadId?: string; objectKey?: string; error?: string };
  if (!reservationResponse.ok || !reservation.uploadId || !reservation.objectKey) throw new Error(reservation.error || "Upload could not be reserved.");
  await upload(reservation.objectKey, file, {
    access: "private",
    handleUploadUrl: "/api/uploads/authorize",
    clientPayload: JSON.stringify({ uploadId: reservation.uploadId }),
    contentType: file.type
  });
  await waitUntilAvailable(reservation.uploadId);
  return reservation.uploadId;
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
