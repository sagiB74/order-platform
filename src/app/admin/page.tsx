// Platform super-admin home. Protected two ways:
//   1. requireTenantContext() redirects to /login if there's no valid session.
//   2. The role check redirects a non-admin to their own area.
// Then it loads all businesses THROUGH the service (which re-checks that the
// caller is a platform admin) and renders them as a table.
import { redirect } from "next/navigation";
import { requireTenantContext } from "@/lib/dal";
import { Role } from "@/generated/prisma/enums";
import { logout } from "@/modules/auth/actions";
import { listBusinesses } from "@/modules/businesses/service";
import { CreateBusinessForm } from "./create-business-form";

export default async function AdminPage() {
  const { user, ctx } = await requireTenantContext();
  if (user.role !== Role.SUPER_ADMIN) {
    redirect("/dashboard"); // a business owner shouldn't be here
  }

  const businesses = await listBusinesses(ctx);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Platform Admin</h1>
          <p className="text-sm text-zinc-500">Signed in as {user.email}</p>
        </div>
        <form action={logout}>
          <button className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
            Log out
          </button>
        </form>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        {/* Businesses table */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Businesses{" "}
            <span className="text-sm font-normal text-zinc-500">
              ({businesses.length})
            </span>
          </h2>

          {businesses.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-6 text-sm text-zinc-500 dark:border-white/15">
              No businesses yet. Create your first one on the right →
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/[.03] text-xs uppercase tracking-wide text-zinc-500 dark:bg-white/[.04]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Link</th>
                    <th className="px-4 py-2.5 font-medium">Owner</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((b) => (
                    <tr
                      key={b.id}
                      className="border-t border-black/[.06] dark:border-white/[.06]"
                    >
                      <td className="px-4 py-2.5 font-medium">{b.name}</td>
                      <td className="px-4 py-2.5">
                        <code className="text-zinc-600 dark:text-zinc-400">
                          /{b.slug}
                        </code>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                        {b.users[0]?.email ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500">
                        {b.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Create form */}
        <CreateBusinessForm />
      </div>
    </main>
  );
}
