import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "clay" | "glaze" | "ok" | "warn" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-soft border-line",
  clay: "bg-clay-soft text-clay-strong border-clay-soft",
  glaze: "bg-glaze-soft text-glaze border-glaze-soft",
  ok: "bg-ok-soft text-ok border-ok-soft",
  warn: "bg-warn-soft text-warn border-warn-soft",
  danger: "bg-danger-soft text-danger border-danger-soft",
};

export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
  ...props
}: ComponentProps<"span"> & { tone?: Tone; icon?: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card border border-line bg-surface shadow-sm", className)} {...props} />;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Section({
  title,
  children,
  action,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="font-serif text-lg font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-ink-soft">{description}</p>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function Alert({
  tone = "neutral",
  title,
  children,
  icon,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div role="status" className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", tones[tone])}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
      </div>
    </div>
  );
}

/** Label/value row used in detail pages. */
export function Fact({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}
