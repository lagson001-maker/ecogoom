import { Database } from "lucide-react";
import { EmptyState } from "@/components/ui/primitives";
import { getCopy } from "@/lib/i18n/server";

/** Shown instead of pages when Supabase env vars are missing — never a blank page. */
export async function SetupNotice() {
  const copy = await getCopy();
  return (
    <EmptyState
      icon={<Database className="h-8 w-8" />}
      title={copy.errors.notConfigured}
      description={
        <>
          {copy.errors.notConfiguredHint} {copy.errors.notConfiguredSteps}
        </>
      }
    />
  );
}
