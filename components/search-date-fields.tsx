"use client";

import { useMemo, useState } from "react";

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function nextDate(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  date.setDate(date.getDate() + 1);
  return localDateString(date);
}

export function SearchDateFields() {
  const today = useMemo(() => localDateString(), []);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const minimumCheckOut = useMemo(() => nextDate(checkIn), [checkIn]);

  return (
    <>
      <label className="search-form__check-in">
        <span className="label">Check in</span>
        <input
          className="field search-form__date"
          name="checkIn"
          type="date"
          min={today}
          value={checkIn}
          onChange={(event) => {
            const value = event.target.value;
            setCheckIn(value);
            if (checkOut && checkOut <= value) setCheckOut("");
          }}
          aria-label="Requested check-in date"
        />
      </label>
      <label className="search-form__check-out">
        <span className="label">Check out</span>
        <input
          className="field search-form__date"
          name="checkOut"
          type="date"
          min={minimumCheckOut}
          value={checkOut}
          onChange={(event) => setCheckOut(event.target.value)}
          aria-label="Requested check-out date"
        />
      </label>
    </>
  );
}
