import { isColorKey } from "@/lib/palette";

/**
 * Identity tag for a category: icon, name and a hue. Colour is redundant here —
 * the icon and the name carry the meaning — so it reads fine in greyscale or
 * with any colour-vision deficiency.
 */
export default function CategoryChip({
  name, icon, color, size = "md", muted,
}: {
  name: string; icon: string; color: string;
  size?: "sm" | "md"; muted?: boolean;
}) {
  const cls = isColorKey(color) ? `cat-${color}` : "cat-slate";
  return (
    <span
      className={`chip border-transparent ${cls} ${size === "sm" ? "px-2 py-0.5 text-[11px]" : ""}`}
      style={{
        background: muted ? "transparent" : "var(--chip-soft)",
        color: muted ? "var(--color-muted)" : "var(--chip-ink)",
      }}
    >
      <span aria-hidden className="text-[13px] leading-none">{icon}</span>
      {name}
    </span>
  );
}

export function CategoryDot({ color, className = "" }: { color: string; className?: string }) {
  const cls = isColorKey(color) ? `cat-${color}` : "cat-slate";
  return (
    <span aria-hidden className={`inline-block size-2.5 shrink-0 rounded-full ${cls} ${className}`}
          style={{ background: "var(--chip-solid)" }} />
  );
}
