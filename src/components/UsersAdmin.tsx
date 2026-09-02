"use client";
import { useActionState, useState } from "react";
import { addUser, resetPassword, toggleActive, type UserState } from "@/app/actions/admin";

type Row = { id: string; name: string; email: string; role: string; active: boolean; entries: number };

/**
 * Placeholder accounts created by the import to carry authorship of migrated rows.
 * Nobody can sign in as one, so offering password or access controls on them is noise.
 */
const isPlaceholder = (u: Row) => u.email.endsWith("@invalid.local");

const ROLE_LABEL: Record<string, string> = {
  FOUNDER: "Founder — sees everything",
  WH: "Warehouse — sees warehouse expenses only",
  HO: "Head office — sees head-office expenses only",
};

export default function UsersAdmin({ users, meId }: { users: Row[]; meId: string }) {
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<Row | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button onClick={() => { setAdding((v) => !v); setResetting(null); }} className="btn-primary">
          {adding ? "Cancel" : "Add person"}
        </button>
      </div>

      {adding && <AddForm onDone={() => setAdding(false)} />}
      {resetting && <ResetForm user={resetting} isMe={resetting.id === meId} onDone={() => setResetting(null)} />}

      <ul className="card divide-y divide-line">
        {users.map((u) => (
          <li key={u.id} className={`flex flex-wrap items-center gap-3 p-4 ${u.active ? "" : "opacity-55"}`}>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{u.name}</span>
                {u.id === meId && <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] text-brand">you</span>}
                {!u.active && (
                  <span className="rounded bg-canvas px-1.5 py-0.5 text-[10px] text-muted">
                    {isPlaceholder(u) ? "record only" : "no access"}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {isPlaceholder(u) ? "Not a real account — holds the imported entries" : u.email}
              </p>
              <p className="mt-1 text-xs text-muted">{ROLE_LABEL[u.role]} · {u.entries} entries</p>
            </div>
            {!isPlaceholder(u) && (
              <div className="flex gap-2">
                <button onClick={() => { setResetting(u); setAdding(false); }} className="btn-ghost px-3 py-1.5 text-xs">
                  Change password
                </button>
                {u.id !== meId && (
                  <form action={toggleActive}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className="btn-ghost px-3 py-1.5 text-xs">
                      {u.active ? "Remove access" : "Restore access"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<UserState, FormData>(addUser, {});
  if (state.ok) queueMicrotask(onDone);
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="text-sm font-semibold">Add person</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="u-name">Name</label>
          <input id="u-name" name="name" required className="input" placeholder="Ravi Patel" />
        </div>
        <div>
          <label className="label" htmlFor="u-email">Email</label>
          <input id="u-email" name="email" type="email" required className="input" placeholder="ravi@araviorganic.com" />
        </div>
        <div>
          <label className="label" htmlFor="u-role">Role</label>
          <select id="u-role" name="role" required defaultValue="WH" className="input">
            <option value="WH">Warehouse</option>
            <option value="HO">Head office</option>
            <option value="FOUNDER">Founder</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="u-pass">Password</label>
          <input id="u-pass" name="password" required minLength={8} className="input" placeholder="At least 8 characters" />
        </div>
      </div>
      <p className="text-xs text-muted">Send them the password yourself — it is not emailed.</p>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">{pending ? "Adding…" : "Add person"}</button>
    </form>
  );
}

function ResetForm({ user, isMe, onDone }: { user: Row; isMe: boolean; onDone: () => void }) {
  const [state, action, pending] = useActionState<UserState, FormData>(resetPassword, {});
  return (
    <form action={action} className="card space-y-4 p-5">
      <input type="hidden" name="id" value={user.id} />
      <h2 className="text-sm font-semibold">
        New password for {isMe ? "yourself" : user.name}
      </h2>
      <div className="max-w-sm">
        <label className="label" htmlFor="r-pass">Password</label>
        <input id="r-pass" name="password" required minLength={8} autoFocus className="input"
               placeholder="At least 8 characters" />
      </div>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{state.ok}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Saving…" : "Change password"}</button>
        <button type="button" onClick={onDone} className="btn-ghost">Close</button>
      </div>
    </form>
  );
}
