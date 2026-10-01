"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setRecipeStatus } from "@/features/recipes/actions";
import type { RecipeStatus } from "@/types/domain";

export function RecipeStatusButtons({ id, status }: { id: string; status: RecipeStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (next: RecipeStatus) =>
    start(async () => {
      const res = await setRecipeStatus(id, next);
      if (res.error) alert(res.error);
      router.refresh();
    });
  return (
    <>
      {status !== "published" && (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => set("published")}>
          Publish
        </Button>
      )}
      {status !== "archived" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => set("archived")}>
          Archive
        </Button>
      )}
    </>
  );
}
