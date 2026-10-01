"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Native <dialog>: bottom sheet on mobile, side panel on desktop.
 * Gets focus trapping and Esc-to-close from the browser.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "center";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-2xl bg-surface p-0 text-ink shadow-xl",
        side === "right"
          ? "md:ml-auto md:mt-0 md:h-dvh md:max-h-dvh md:w-[420px] md:rounded-none md:rounded-l-2xl"
          : "md:m-auto md:max-w-lg md:rounded-2xl",
      )}
    >
      <div className="flex max-h-[inherit] flex-col md:h-full">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-serif text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </dialog>
  );
}
