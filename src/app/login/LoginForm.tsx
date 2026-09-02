"use client";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <form action={action} className="card w-full max-w-sm p-7">
        <p className="text-xs font-semibold tracking-widest text-brand uppercase">
          Hivefy Lifestyle
        </p>
        <h1 className="mt-1 text-xl font-semibold">Expense Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Sign in to record or review expenses.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="username"
                   className="input" placeholder="you@araviorganic.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required
                   autoComplete="current-password" className="input" />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary mt-5 w-full">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
