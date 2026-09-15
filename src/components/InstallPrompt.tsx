"use client";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isIos = () =>
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);

/**
 * Android fires beforeinstallprompt and we can show a real button. iOS never does,
 * so it gets the manual Share → Add to Home Screen instruction instead.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setInstalled(isStandalone());
    try { setDismissed(localStorage.getItem("hlpl-install-dismissed") === "1"); }
    catch { setDismissed(false); }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;
  if (!deferred && !isIos()) return null;

  const hide = () => {
    setDismissed(true);
    try { localStorage.setItem("hlpl-install-dismissed", "1"); } catch { /* ignore */ }
  };

  return (
    <div className="card mb-4 flex flex-wrap items-center gap-3 border-brand/20 bg-brand-soft p-4">
      <span aria-hidden className="text-xl">📲</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-brand">Keep this on your home screen</p>
        <p className="mt-0.5 text-xs text-brand/80">
          {isIos()
            ? "Tap Share, then Add to Home Screen. It opens like an app and works without signal."
            : "Opens like an app, stays signed in, and works without signal."}
        </p>
      </div>
      {deferred ? (
        <button
          onClick={async () => { await deferred.prompt(); await deferred.userChoice; hide(); }}
          className="btn-primary px-3 py-2 text-xs">
          Install
        </button>
      ) : null}
      <button onClick={hide} className="btn-ghost px-3 py-2 text-xs">Not now</button>
    </div>
  );
}
