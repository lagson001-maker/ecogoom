"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toggleInventory } from "./actions";
import { copy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function InventoryButton({
  glazeId,
  owned,
  signedIn,
  size = "md",
}: {
  glazeId: string;
  owned: boolean;
  signedIn: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(owned);

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={optimistic}
      onClick={() => {
        if (!signedIn) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        start(async () => {
          setOptimistic(!optimistic);
          const res = await toggleInventory(glazeId);
          if (res.error) alert(res.error);
          router.refresh();
        });
      }}
      className={cn(
        "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors",
        size === "sm" ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm",
        optimistic ? "bg-ok-soft text-ok hover:bg-line" : "bg-clay text-white hover:bg-clay-strong",
      )}
    >
      {optimistic ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
      {optimistic ? copy.inventory.inMyGlazes : size === "sm" ? "Add" : copy.inventory.add}
    </button>
  );
}
