"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export type SignInState = { error: string; email: string } | null;

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!(await signIn(email, password))) {
    return { error: "Wrong email or password.", email };
  }
  redirect("/");
}
