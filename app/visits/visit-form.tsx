"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import type { VisitFormState } from "./actions";
import { localToday } from "@/lib/dates";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "../ui";

type Props = {
  action: (prev: VisitFormState, formData: FormData) => Promise<VisitFormState>;
  initial?: { label: string; date: string };
  submitLabel: string;
  cancelHref: string;
};

export function VisitForm({ action, initial, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const dateRef = useRef<HTMLInputElement>(null);

  // A new visit defaults to today in the phone's time zone (the server may be elsewhere).
  useEffect(() => {
    if (dateRef.current && !dateRef.current.value) dateRef.current.value = localToday();
  }, []);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Label</span>
        <input
          name="label"
          required
          maxLength={80}
          autoComplete="off"
          autoFocus={!initial}
          defaultValue={initial?.label}
          placeholder="e.g. Friday at U Medveda"
          className={inputClass}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Date</span>
        <input
          ref={dateRef}
          name="date"
          type="date"
          required
          defaultValue={initial?.date}
          className={`${inputClass} appearance-none`}
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link href={cancelHref} className={secondaryButtonClass}>
          Cancel
        </Link>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
