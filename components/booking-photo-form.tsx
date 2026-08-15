"use client";

import { Camera, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { uploadBookingPhotoAction } from "@/app/actions";
import { PrivateUploadField } from "@/components/private-upload-field";

type Props = {
  bookingId: string;
  type: "CHECK_IN" | "CHECK_OUT";
  label: string;
};

export function BookingPhotoForm({ bookingId, type, label }: Props) {
  const [isReady, setIsReady] = useState(false);

  return (
    <form action={uploadBookingPhotoAction} className="grid gap-3 border border-neutral-200 bg-white p-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="uploadKind" value={type} />
      <PrivateUploadField
        label={label}
        name="photo"
        type={type}
        bookingId={bookingId}
        accept="image/jpeg,image/png,image/webp"
        required
        onReadyChange={setIsReady}
      />
      <button className="button-secondary" type="submit" disabled={!isReady} aria-disabled={!isReady}>
        {isReady ? <Camera size={18} /> : <LoaderCircle size={18} />}
        {isReady ? "Upload" : "Choose a photo and wait until it is ready"}
      </button>
    </form>
  );
}
