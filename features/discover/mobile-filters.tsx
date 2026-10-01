"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/i18n";

/** Opens the (server-rendered) filter form in a bottom sheet on small screens. */
export function MobileFilters({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="lg:hidden" aria-haspopup="dialog">
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        {copy.common.filters}
        {count > 0 && <span className="rounded-full bg-clay px-1.5 text-xs text-white">{count}</span>}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={copy.common.filters}>
        {children}
      </Sheet>
    </>
  );
}
