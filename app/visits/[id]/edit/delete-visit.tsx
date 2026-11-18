"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVisitAction } from "../../../visits/actions";
import { draftKey, removeDraft } from "@/lib/draft";
import { forgetOfflinePages } from "../../../service-worker";
import { dangerButtonClass, secondaryButtonClass } from "../../../ui";

type Props = { visitId: number; label: string; createdAt: string; itemCount: number };

export function DeleteVisit({ visitId, label, createdAt, itemCount }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function confirmDelete() {
    startTransition(async () => {
      try {
        const result = await deleteVisitAction(visitId);
        if ("error" in result) {
          setError(result.error);
          return;
        }
      } catch {
        setError("No connection. The visit can only be deleted while online.");
        return;
      }
      // Forget what this phone kept about the visit, so it can't come back.
      removeDraft(draftKey(visitId, createdAt));
      await forgetOfflinePages([`/visits/${visitId}`, `/visits/${visitId}/edit`]).catch(() => {});
      dialogRef.current?.close();
      router.replace("/");
    });
  }

  return (
    <>
      <div className="mt-auto border-t border-line pt-6">
        <button
          type="button"
          onClick={open}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-line bg-surface px-5 font-medium text-danger active:scale-[0.98] transition"
        >
          Delete visit
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-visit-title"
        aria-describedby="delete-visit-text"
        // Tapping the dimmed area outside the box cancels.
        onClick={(e) => e.target === e.currentTarget && !pending && dialogRef.current?.close()}
        onCancel={(e) => pending && e.preventDefault()}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-5">
          <h2 id="delete-visit-title" className="text-lg font-bold tracking-tight">
            Delete this visit?
          </h2>
          <p id="delete-visit-text" className="mt-2 text-muted">
            <span className="font-medium text-ink">“{label}”</span>
            {itemCount > 0 ? ` and its ${itemCount} ${itemCount === 1 ? "item" : "items"}` : ""} will be
            deleted. This can’t be undone.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            <button type="button" onClick={confirmDelete} disabled={pending} className={dangerButtonClass}>
              {pending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
