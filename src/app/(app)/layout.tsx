import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import NavLink from "@/components/NavLink";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireUser();
  const founder = s.role === "FOUNDER";

  const nav = founder
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/entry", label: "Add expense" },
        { href: "/expenses", label: "All expenses" },
        { href: "/cash", label: "Cash & float" },
        { href: "/categories", label: "Categories" },
        { href: "/users", label: "People" },
        { href: "/import", label: "Import" },
      ]
    : [
        { href: "/entry", label: "Add expense" },
        { href: "/expenses", label: "My expenses" },
        { href: "/reconcile", label: "Cash in hand" },
      ];

  const scope = founder ? "Founder" : s.costCenter === "WH" ? "Warehouse" : "Head Office";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href={founder ? "/dashboard" : "/entry"} className="shrink-0">
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-brand">
              Hivefy
            </span>
            <span className="block text-sm font-semibold leading-tight">Expense Dashboard</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 sm:flex">
            {nav.map((i) => <NavLink key={i.href} {...i} />)}
          </nav>

          <div className="ml-auto flex items-center gap-3 sm:ml-2">
            <span className="hidden text-right text-xs leading-tight md:block">
              <span className="block font-medium">{s.name}</span>
              <span className="block text-muted">{scope}</span>
            </span>
            <form action={logout}>
              <button className="btn-ghost px-3 py-1.5 text-xs">Sign out</button>
            </form>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 sm:hidden">
          {nav.map((i) => <NavLink key={i.href} {...i} />)}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
