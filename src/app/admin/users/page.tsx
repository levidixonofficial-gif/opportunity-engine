import { listAdminUsers } from "@/server/services/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { RoleControl } from "./RoleControl";

export const metadata = { title: "Admin · Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const users = await listAdminUsers(q);

  return (
    <Card>
      <CardContent className="p-0">
        <form className="border-b p-3">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by email"
            className="h-9 w-full max-w-xs rounded-md border bg-surface px-3 text-sm"
          />
        </form>
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Email</th>
              <th scope="col" className="px-4 py-2 font-medium">Plan</th>
              <th scope="col" className="px-4 py-2 font-medium">Joined</th>
              <th scope="col" className="px-4 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-surface-2">
                <td className="px-4 py-2.5">{u.email}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={u.subscription?.plan === "free" ? "neutral" : "accent"}>
                    {u.subscription?.plan ?? "free"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-muted">{u.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-2.5">
                  <RoleControl userId={u.id} role={u.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
