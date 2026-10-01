import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { getCopy } from "@/lib/i18n/server";

export default async function NotFound() {
  const copy = await getCopy();
  return (
    <EmptyState
      icon={<SearchX className="h-8 w-8" />}
      title={copy.errors.notFound}
      description={copy.errors.pageNotFound}
      actions={<LinkButton href="/">{copy.nav.discover}</LinkButton>}
    />
  );
}
