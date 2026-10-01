import { Database } from "lucide-react";
import { EmptyState } from "@/components/ui/primitives";
import { copy } from "@/lib/i18n";

/** Shown instead of pages when Supabase env vars are missing — never a blank page. */
export function SetupNotice() {
  return (
    <EmptyState
      icon={<Database className="h-8 w-8" />}
      title={copy.errors.notConfigured}
      description={
        <>
          {copy.errors.notConfiguredHint} Copy <code>.env.example</code> to <code>.env.local</code>, fill in your project
          URL and publishable key, then restart the server.
        </>
      }
    />
  );
}
