/** Small inline icons. Stroke-based so they inherit colour and stay crisp. */
const base = {
  width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round",
} as const;

export function PencilIcon(p: { className?: string }) {
  return (
    <svg {...base} {...p} aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function TrashIcon(p: { className?: string }) {
  return (
    <svg {...base} {...p} aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}

export function CloseIcon(p: { className?: string }) {
  return <svg {...base} {...p} aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>;
}

export function FilterIcon(p: { className?: string }) {
  return <svg {...base} {...p} aria-hidden><path d="M3 5h18l-7 8v6l-4 2v-8Z" /></svg>;
}

export function CheckIcon(p: { className?: string }) {
  return <svg {...base} {...p} aria-hidden><path d="m4 12 5 5L20 6" /></svg>;
}

export function ChevronIcon(p: { className?: string }) {
  return <svg {...base} {...p} aria-hidden><path d="m6 9 6 6 6-6" /></svg>;
}

export function PlusIcon(p: { className?: string }) {
  return <svg {...base} {...p} aria-hidden><path d="M12 5v14M5 12h14" /></svg>;
}
