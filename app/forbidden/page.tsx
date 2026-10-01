import { ShieldAlert } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { getCopy } from "@/lib/i18n/server";

export default async function ForbiddenPage() {
  const copy = await getCopy();
  return (
    <EmptyState
      icon={<ShieldAlert className="h-8 w-8" />}
      title={copy.errors.unauthorized}
      description={copy.admin.forbidden}
      actions={<LinkButton href="/">{copy.nav.discover}</LinkButton>}
    />
  );
}
