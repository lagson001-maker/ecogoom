"use client";

import { StatefulForm } from "@/components/ui/stateful-form";
import { useActionState, type ReactNode } from "react";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCopy } from "@/lib/i18n/client";
import type { ActionState } from "@/lib/forms";

/** Form bound to a server action with inline success/error feedback. Fields come in as children. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const copy = useCopy();
  const [state, formAction] = useActionState(action, null);
  return (
    <StatefulForm action={formAction} className={className ?? "flex flex-col gap-3"}>
      {children}
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel={copy.common.saving}>{submitLabel ?? copy.common.save}</SubmitButton>
      </div>
    </StatefulForm>
  );
}
