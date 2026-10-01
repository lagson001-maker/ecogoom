"use client";

import { createContext, useContext, useTransition, type ComponentProps } from "react";

const PendingContext = createContext(false);

export function useStatefulFormPending(): boolean {
  return useContext(PendingContext);
}

/**
 * Form that submits through a transition instead of the `action` prop.
 *
 * React 19 resets uncontrolled fields after every `<form action>` run, which
 * wipes what the user typed when the server returns a validation error. This
 * keeps their input, and still sends the clicked submit button's name/value.
 */
export function StatefulForm({
  action,
  children,
  ...props
}: Omit<ComponentProps<"form">, "action" | "onSubmit"> & { action: (fd: FormData) => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <PendingContext.Provider value={pending}>
      <form
        {...props}
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter;
          const fd = new FormData(e.currentTarget, submitter instanceof HTMLElement ? submitter : null);
          startTransition(() => action(fd));
        }}
      >
        {children}
      </form>
    </PendingContext.Provider>
  );
}
