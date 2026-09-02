"use client";
import { useActionState } from "react";
import { runSetup, type SetupState } from "@/app/actions/setup";

export default function SetupForm() {
  const [state, action, pending] = useActionState<SetupState, FormData>(runSetup, {});
  return (
    <form action={action} className="card mt-5 space-y-4 p-6">
      <div>
        <label className="label" htmlFor="s-name">Your name</label>
        <input id="s-name" name="name" required autoFocus className="input" placeholder="Krinesh Mangukiya" />
      </div>
      <div>
        <label className="label" htmlFor="s-email">Email</label>
        <input id="s-email" name="email" type="email" required autoComplete="username"
               className="input" placeholder="krinesh@araviorganic.com" />
      </div>
      <div>
        <label className="label" htmlFor="s-pass">Password</label>
        <input id="s-pass" name="password" type="password" required minLength={8}
               autoComplete="new-password" className="input" placeholder="At least 8 characters" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Setting up…" : "Create my account"}
      </button>
    </form>
  );
}
