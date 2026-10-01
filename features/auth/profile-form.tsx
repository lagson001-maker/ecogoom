"use client";

import { StatefulForm } from "@/components/ui/stateful-form";
import { useActionState } from "react";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProfile } from "./actions";
import { copy } from "@/lib/i18n";

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action] = useActionState(updateProfile, null);
  return (
    <StatefulForm action={action} className="flex flex-col gap-3">
      <Field label="Display name" htmlFor="display_name">
        <Input id="display_name" name="display_name" defaultValue={displayName} maxLength={80} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="secondary">{copy.common.save}</SubmitButton>
    </StatefulForm>
  );
}
