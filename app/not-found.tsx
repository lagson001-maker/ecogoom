import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { copy } from "@/lib/i18n";

export default function NotFound() {
  return (
    <EmptyState
      icon={<SearchX className="h-8 w-8" />}
      title={copy.errors.notFound}
      description="This page doesn't exist, was removed, or you don't have access to it."
      actions={<LinkButton href="/">{copy.nav.discover}</LinkButton>}
    />
  );
}
