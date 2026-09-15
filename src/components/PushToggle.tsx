"use client";
import { useEffect, useState } from "react";
import { pushPublicKey, subscribe, unsubscribe, sendTestPush } from "@/app/actions/push";

type Status = "loading" | "unsupported" | "needs-install" | "off" | "on" | "blocked";

/** VAPID keys travel as base64url; the browser wants raw bytes. */
function toBytes(base64url: string): Uint8Array {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const b64 = (base64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const isIos = () =>
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    // iOS reports it here rather than through display-mode
    (navigator as unknown as { standalone?: boolean }).standalone === true);

export default function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // Safari on iOS only exposes push once the app is on the home screen.
        setStatus(isIos() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") { setStatus("blocked"); return; }
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    })();
  }, []);

  async function turnOn() {
    setBusy(true); setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("blocked"); return; }

      const key = await pushPublicKey();
      if (!key) { setMsg("Reminders are not set up on the server yet."); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toBytes(key) as BufferSource,
      });

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await subscribe({ endpoint: json.endpoint, keys: json.keys });
      if (res.error) { setMsg(res.error); await sub.unsubscribe(); return; }
      setStatus("on"); setMsg(res.ok ?? null);
    } catch {
      setMsg("This browser refused to set up reminders.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true); setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await unsubscribe(sub.endpoint); await sub.unsubscribe(); }
      setStatus("off"); setMsg("Reminders are off for this phone.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    const r = await sendTestPush();
    setMsg(r.error ?? r.ok ?? null);
    setBusy(false);
  }

  if (status === "loading") return null;

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">Daily reminder</h2>
      <p className="mt-1 text-sm text-muted">
        A notification at 6pm showing what you have recorded today and what cash you are
        still holding. Set it up on each phone separately.
      </p>

      {status === "needs-install" && (
        <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          On iPhone, reminders work only once this is on your home screen. Tap Share,
          then <strong>Add to Home Screen</strong>, open it from there and come back.
        </p>
      )}
      {status === "unsupported" && (
        <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-sm text-muted">
          This browser cannot show reminders. Chrome on Android or Safari on iPhone can.
        </p>
      )}
      {status === "blocked" && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          Notifications are blocked for this site. Allow them in your browser settings,
          then reload.
        </p>
      )}

      {(status === "off" || status === "on") && (
        <div className="mt-4 flex flex-wrap gap-2">
          {status === "off" ? (
            <button onClick={turnOn} disabled={busy} className="btn-primary">
              {busy ? "Setting up…" : "Turn on reminders"}
            </button>
          ) : (
            <>
              <button onClick={turnOff} disabled={busy} className="btn-ghost">Turn off</button>
              <button onClick={test} disabled={busy} className="btn-soft">Send a test</button>
            </>
          )}
        </div>
      )}

      {msg && <p role="status" className="mt-3 text-sm text-muted">{msg}</p>}
    </section>
  );
}
