"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toggleSaveRecipe } from "./actions";
import { useCopy } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function SaveButton({
  recipeId,
  saved,
  signedIn,
  compact,
}: {
  recipeId: string;
  saved: boolean;
  signedIn: boolean;
  compact?: boolean;
}) {
  const copy = useCopy();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(saved);

  const onClick = () => {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    start(async () => {
      setOptimistic(!optimistic);
      const res = await toggleSaveRecipe(recipeId);
      if (res.error) alert(res.error);
      router.refresh();
    });
  };

  const Icon = optimistic ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={optimistic}
      aria-label={optimistic ? copy.common.saved : copy.common.save}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors",
        compact
          ? "h-10 w-10 bg-surface/90 text-ink shadow-sm backdrop-blur hover:bg-surface"
          : "h-11 border border-line-strong bg-surface px-4 text-sm text-ink hover:bg-surface-2",
        optimistic && "text-clay",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {!compact && (optimistic ? copy.common.saved : copy.common.save)}
    </button>
  );
}
