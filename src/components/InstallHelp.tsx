"use client";
import { useEffect, useState } from "react";

const isIos = () =>
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

export default function InstallHelp() {
  const [standalone, setStandalone] = useState<boolean | null>(null);

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
  }, []);

  if (standalone === null) return null;

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">App on your phone</h2>
      {standalone ? (
        <p className="mt-2 rounded-lg bg-good-soft px-3 py-2 text-sm text-good">
          ✓ Running from your home screen. Entries you make without signal are saved and
          sent automatically.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Add it to your home screen so it opens like an app, stays signed in, and keeps
            working when the warehouse has no signal.
          </p>
          <ol className="mt-3 space-y-1.5 text-sm text-body">
            {isIos() ? (
              <>
                <li>1. Tap the Share button in Safari.</li>
                <li>2. Choose <strong>Add to Home Screen</strong>.</li>
                <li>3. Open it from the new icon, not from Safari.</li>
              </>
            ) : (
              <>
                <li>1. Open the browser menu (⋮).</li>
                <li>2. Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                <li>3. Open it from the new icon.</li>
              </>
            )}
          </ol>
        </>
      )}
    </section>
  );
}
