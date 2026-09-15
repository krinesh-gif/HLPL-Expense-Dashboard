"use client";
import { useCallback, useEffect, useState } from "react";
import { addExpense } from "@/app/actions/expense";
import { all, count, markFailed, remove, type PendingExpense } from "@/lib/outbox";

/**
 * Shows what is waiting to be sent and flushes the queue whenever the phone comes
 * back online. Entries are sent oldest first and one at a time — a warehouse
 * connection that just returned does not cope well with a burst.
 */
export default function OfflineSync() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [justSent, setJustSent] = useState(0);

  const refresh = useCallback(async () => setPending(await count()), []);

  const flush = useCallback(async () => {
    if (syncing || !navigator.onLine) return;
    const rows = await all();
    if (rows.length === 0) return;

    setSyncing(true);
    let sent = 0;
    for (const row of rows) {
      try {
        const form = toFormData(row);
        const res = await addExpense({}, form);
        if (res.error) {
          // A rejection is about the entry itself — a category closed since it was
          // queued, say. Retrying will not help, so drop it and surface the reason.
          await markFailed(row, res.error);
          if (row.attempts >= 2) await remove(row.clientId);
        } else {
          await remove(row.clientId);
          sent++;
        }
      } catch {
        break; // network went again; keep the rest queued
      }
    }
    setSyncing(false);
    if (sent) setJustSent(sent);
    await refresh();
  }, [syncing, refresh]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();

    const up = () => { setOnline(true); flush(); };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    window.addEventListener("hlpl:queued", refresh);

    if (navigator.onLine) flush();
    const timer = setInterval(() => { if (navigator.onLine) flush(); }, 60_000);

    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      window.removeEventListener("hlpl:queued", refresh);
      clearInterval(timer);
    };
  }, [flush, refresh]);

  useEffect(() => {
    if (!justSent) return;
    const t = setTimeout(() => setJustSent(0), 4000);
    return () => clearTimeout(t);
  }, [justSent]);

  if (online && pending === 0 && !justSent) return null;

  return (
    <div role="status" className="mb-4">
      {!online && (
        <p className="chip w-full justify-start border-warn/25 bg-warn-soft px-3 py-2 text-warn">
          <span aria-hidden>📡</span>
          No signal — entries are saved on this phone and sent automatically.
        </p>
      )}
      {pending > 0 && (
        <p className="chip mt-2 w-full justify-start border-line bg-surface px-3 py-2 text-body">
          <span aria-hidden>{syncing ? "⏳" : "📥"}</span>
          {pending} {pending === 1 ? "entry" : "entries"} waiting to send
          {syncing ? " — sending now…" : online ? "" : ""}
        </p>
      )}
      {justSent > 0 && pending === 0 && (
        <p className="chip w-full justify-start border-good/25 bg-good-soft px-3 py-2 text-good">
          <span aria-hidden>✓</span>
          {justSent} offline {justSent === 1 ? "entry" : "entries"} sent.
        </p>
      )}
    </div>
  );
}

function toFormData(row: PendingExpense): FormData {
  const f = new FormData();
  f.set("clientId", row.clientId);
  f.set("date", row.date);
  f.set("categoryId", row.categoryId);
  f.set("amount", String(row.amount));
  f.set("paymentMode", row.paymentMode);
  if (row.paidTo) f.set("paidTo", row.paidTo);
  if (row.description) f.set("description", row.description);
  if (row.billNo) f.set("billNo", row.billNo);
  return f;
}
