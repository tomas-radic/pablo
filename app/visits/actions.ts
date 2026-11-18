"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/auth";
import { createVisit, deleteVisit, updateVisit, validateVisit } from "@/lib/visits";

export type VisitFormState = { error: string } | null;

export async function createVisitAction(
  _prev: VisitFormState,
  formData: FormData,
): Promise<VisitFormState> {
  const user = await getCurrentUser();
  const result = validateVisit(formData.get("label"), formData.get("date"));
  if (!result.ok) return { error: result.error };
  const id = createVisit(user.id, result.label, result.date);
  redirect(`/visits/${id}`);
}

export async function updateVisitAction(
  visitId: number,
  returnTo: string,
  _prev: VisitFormState,
  formData: FormData,
): Promise<VisitFormState> {
  const user = await getCurrentUser();
  const result = validateVisit(formData.get("label"), formData.get("date"));
  if (!result.ok) return { error: result.error };
  if (!updateVisit(user.id, visitId, result.label, result.date)) {
    return { error: "This visit doesn’t exist any more." };
  }
  redirect(returnTo === "visit" ? `/visits/${visitId}` : "/");
}

export async function deleteVisitAction(visitId: number): Promise<{ error: string } | { ok: true }> {
  const user = await getCurrentUser();
  if (!deleteVisit(user.id, visitId)) return { error: "This visit doesn’t exist any more." };
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}
