"use client";

import { StatefulForm } from "@/components/ui/stateful-form";
import { useActionState, useState } from "react";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { authAction } from "./actions";
import { useCopy } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "magic";
export function LoginForm({ next }: { next: string }) {
  const copy = useCopy();
  const t = copy.auth;
  const [mode, setMode] = useState<Mode>("signin");
  const [state, action] = useActionState(authAction, null);

  const tabs: { value: Mode; label: string }[] = [
    { value: "signin", label: t.signIn },
    { value: "signup", label: t.signUp },
    { value: "magic", label: t.magicTab },
  ];

  return (
    <div>
      <div role="tablist" aria-label={t.method} className="mb-5 grid grid-cols-3 rounded-lg bg-surface-2 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={mode === tab.value}
            onClick={() => setMode(tab.value)}
            className={cn(
              "h-10 rounded-md text-sm font-medium",
              mode === tab.value ? "bg-surface text-ink shadow-sm" : "text-ink-soft",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <StatefulForm action={action} className="flex flex-col gap-4">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={next} />
        <Field label={t.email} htmlFor="email" error={state?.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        {mode !== "magic" && (
          <Field label={t.password} htmlFor="password" error={state?.fieldErrors?.password} hint={mode === "signup" ? t.passwordHint : undefined}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </Field>
        )}
        <FormMessage state={state} />
        <SubmitButton size="lg" pendingLabel={t.wait}>
          {mode === "signin" ? t.signIn : mode === "signup" ? t.signUp : t.magicLink}
        </SubmitButton>
      </StatefulForm>
    </div>
  );
}
