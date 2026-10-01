import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-muted focus-visible:border-focus sm:text-sm";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-11 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink", className)}>
      <input type="checkbox" className="h-5 w-5 rounded border-line-strong accent-clay" {...props} />
      <span>{label}</span>
    </label>
  );
}

/** Toggle-chip implemented as a styled checkbox: keyboard and screen-reader friendly. */
export function ChipCheckbox({
  name,
  value,
  label,
  defaultChecked,
  swatch,
}: {
  name: string;
  value: string;
  label: ReactNode;
  defaultChecked?: boolean;
  swatch?: string;
}) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-sm text-ink-soft transition-colors peer-checked:border-clay peer-checked:bg-clay-soft peer-checked:text-clay-strong peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
        {swatch && <span aria-hidden className="h-3 w-3 rounded-full border border-black/10" style={{ background: swatch }} />}
        {label}
      </span>
    </label>
  );
}

/** Same as ChipCheckbox but single-choice. */
export function ChipRadio({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: ReactNode;
  defaultChecked?: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-flex min-h-9 items-center rounded-full border border-line-strong bg-surface px-3 text-sm text-ink-soft transition-colors peer-checked:border-clay peer-checked:bg-clay-soft peer-checked:text-clay-strong peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
        {label}
      </span>
    </label>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message?: string } | null }) {
  if (!state?.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "rounded-lg px-3 py-2 text-sm",
        state.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger",
      )}
    >
      {state.message}
    </p>
  );
}
