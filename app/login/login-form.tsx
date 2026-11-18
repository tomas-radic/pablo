"use client";

import { useActionState } from "react";
import { signInAction } from "./actions";
import { inputClass, primaryButtonClass } from "../ui";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state?.email}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
