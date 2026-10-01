import { AdminNav } from "@/features/admin/admin-nav";
import { requireEditor } from "@/lib/data/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireEditor();
  return (
    <div>
      <AdminNav isAdmin={viewer.isAdmin} />
      {children}
    </div>
  );
}
