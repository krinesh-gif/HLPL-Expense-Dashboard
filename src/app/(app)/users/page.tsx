import { prisma } from "@/lib/prisma";
import { requireFounder } from "@/lib/auth";
import UsersAdmin from "@/components/UsersAdmin";

export default async function UsersPage() {
  const me = await requireFounder();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { _count: { select: { expenses: true } } },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">People</h1>
        <p className="mt-1 text-sm text-muted">
          A person’s role fixes what they can see. Warehouse and head-office users are
          locked to their own expenses and cannot reach these screens.
        </p>
      </div>
      <UsersAdmin
        meId={me.uid}
        users={users.map((u) => ({
          id: u.id, name: u.name, email: u.email, role: u.role,
          active: u.active, entries: u._count.expenses,
        }))}
      />
    </div>
  );
}
