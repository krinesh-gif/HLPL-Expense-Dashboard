import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import NavLink from "@/components/NavLink";
import ThemeToggle from "@/components/ThemeToggle";

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
  const initials = s.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href={founder ? "/dashboard" : "/entry"} className="group shrink-0">
            <span className="flex items-center gap-2">
              <span aria-hidden
                    className="grid size-8 place-items-center rounded-xl bg-brand text-sm font-bold text-white">
                H
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Hivefy
                </span>
                <span className="block text-sm font-semibold">Expenses</span>
              </span>
            </span>
          </Link>

          <nav className="no-scrollbar mx-auto hidden items-center gap-0.5 overflow-x-auto lg:flex">
            {nav.map((i) => <NavLink key={i.href} {...i} />)}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 sm:flex">
              <span aria-hidden
                    className="grid size-6 place-items-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">
                {initials}
              </span>
              <span className="text-[11px] leading-tight">
                <span className="block font-medium">{s.name.split(" ")[0]}</span>
                <span className="block text-muted">{scope}</span>
              </span>
            </span>
            <form action={logout}>
              <button className="btn-ghost px-3 py-1.5 text-xs">Sign out</button>
            </form>
          </div>
        </div>

        <nav className="no-scrollbar flex gap-0.5 overflow-x-auto border-t border-line px-4 py-2 lg:hidden">
          {nav.map((i) => <NavLink key={i.href} {...i} />)}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
