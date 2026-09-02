"use client";
import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

/**
 * Stamps data-theme on <html>. Absent stamp means "follow the OS", which the
 * stylesheet handles through prefers-color-scheme.
 */
export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    let saved: Mode = "system";
    try { saved = (localStorage.getItem("hlpl-theme") as Mode) ?? "system"; } catch { /* private mode */ }
    apply(saved);
    setMode(saved);
  }, []);

  function apply(m: Mode) {
    const root = document.documentElement;
    if (m === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", m);
    try { localStorage.setItem("hlpl-theme", m); } catch { /* ignore */ }
  }

  function next() {
    const order: Mode[] = ["system", "light", "dark"];
    const m = order[(order.indexOf(mode) + 1) % order.length];
    setMode(m); apply(m);
  }

  const icon = mode === "dark" ? "🌙" : mode === "light" ? "☀️" : "🖥️";
  return (
    <button onClick={next} className="icon-btn" title={`Theme: ${mode}`} aria-label={`Theme: ${mode}. Change.`}>
      <span aria-hidden className="text-sm">{icon}</span>
    </button>
  );
}
