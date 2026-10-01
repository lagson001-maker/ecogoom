"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "./button";
import { useStatefulFormPending } from "./stateful-form";

export function SubmitButton({
  children,
  pendingLabel,
  confirmMessage,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string; confirmMessage?: string }) {
  const status = useFormStatus();
  const transitionPending = useStatefulFormPending();
  const pending = status.pending || transitionPending;
  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
