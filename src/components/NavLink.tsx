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
      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
        active ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-canvas hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
