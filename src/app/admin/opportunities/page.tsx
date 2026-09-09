import Link from "next/link";
import { listAdminOpportunities } from "@/server/services/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Admin · Opportunities" };

export default async function AdminOpportunitiesPage() {
  const opps = await listAdminOpportunities();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/admin/opportunities/new" className={buttonVariants({ size: "sm" })}>
          New opportunity
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Name</th>
                <th scope="col" className="px-4 py-2 font-medium">Category</th>
                <th scope="col" className="px-4 py-2 font-medium">Status</th>
                <th scope="col" className="px-4 py-2 font-medium">Saves</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {opps.map((o) => (
                <tr key={o.id} className="hover:bg-surface-2">
                  <td className="px-4 py-2.5 font-medium">{o.name}</td>
                  <td className="px-4 py-2.5 text-muted">{o.category.label}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={o.status === "published" ? "success" : o.status === "draft" ? "warning" : "neutral"}>
                      {o.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{o._count.saved}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/admin/opportunities/${o.id}`} className="text-xs text-accent hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted">
        Editing here changes the live opportunity library without a deploy (spec §7). Seed data in{" "}
        <code>prisma/seed.ts</code> is the baseline; admin edits win.
      </p>
    </div>
  );
}
