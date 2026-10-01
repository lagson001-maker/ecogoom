import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import { Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { setUserRole } from "@/features/admin/actions";
import { getViewer } from "@/lib/data/auth";
import { listProfiles } from "@/lib/data/admin";
import { copy } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: copy.admin.users };

export default async function AdminUsersPage() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) redirect("/forbidden");
  const profiles = await listProfiles();

  return (
    <>
      <PageHeader title={copy.admin.users} subtitle="Editors manage the catalog and public recipes. Admins can also delete and manage roles." />
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {profiles.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{p.display_name ?? "—"}</p>
              <p className="text-xs text-muted">joined {formatDate(p.created_at)}</p>
            </div>
            {p.id === viewer.userId ? (
              <span className="text-sm text-muted">{p.role} (you)</span>
            ) : (
              <form action={setUserRole} className="flex gap-2">
                <input type="hidden" name="id" value={p.id} />
                <Select name="role" defaultValue={p.role} aria-label={`Role for ${p.display_name ?? "user"}`} className="w-32">
                  <option value="user">user</option>
                  <option value="editor">editor</option>
                  <option value="admin">admin</option>
                </Select>
                <SubmitButton size="sm" variant="secondary">
                  {copy.common.save}
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
