"use client";

import { AlertTriangle } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { copy } from "@/lib/i18n";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-8 w-8" />}
      title={copy.errors.generic}
      description={
        <>
          {copy.errors.unavailable}
          {error.digest && <span className="mt-2 block text-xs text-muted">Ref: {error.digest}</span>}
        </>
      }
      actions={
        <>
          <Button onClick={reset}>Try again</Button>
          <LinkButton href="/" variant="outline">
            {copy.nav.discover}
          </LinkButton>
        </>
      }
    />
  );
}
