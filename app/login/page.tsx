import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-8 py-10">
      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-wide text-accent-strong uppercase">Publog</p>
        <h1 className="text-3xl font-bold tracking-tight">Check the bill, not your memory.</h1>
        <p className="text-muted">Sign in to see your pub visits.</p>
      </div>
      <LoginForm />
    </main>
  );
}
