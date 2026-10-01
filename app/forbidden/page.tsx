import { ShieldAlert } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { copy } from "@/lib/i18n";

export default function ForbiddenPage() {
  return (
    <EmptyState
      icon={<ShieldAlert className="h-8 w-8" />}
      title={copy.errors.unauthorized}
      description={copy.admin.forbidden}
      actions={<LinkButton href="/">{copy.nav.discover}</LinkButton>}
    />
  );
}
