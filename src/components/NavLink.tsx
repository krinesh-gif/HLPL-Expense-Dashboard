"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, label }: { href: string; label: string }) {
  const path = usePathname();
  const active = path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
        active ? "font-semibold text-ink" : "text-muted hover:bg-canvas hover:text-body"
      }`}
    >
      {label}
      {active && (
        <span aria-hidden
              className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand" />
      )}
    </Link>
  );
}
