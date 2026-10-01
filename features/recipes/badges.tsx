"use client";

import { AlertTriangle, BadgeCheck, CircleHelp, FlaskConical, Factory, Users, Waves } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/primitives";
import { useCopy } from "@/lib/i18n/client";
import { riskLevel, vocab } from "@/lib/vocabulary";
import type { DinnerwareSuitability, VerificationStatus } from "@/types/domain";

const verificationIcon: Record<VerificationStatus, React.ReactNode> = {
  unverified: <CircleHelp className="h-3.5 w-3.5" aria-hidden />,
  community_reported: <Users className="h-3.5 w-3.5" aria-hidden />,
  manufacturer_documented: <Factory className="h-3.5 w-3.5" aria-hidden />,
  personally_tested: <FlaskConical className="h-3.5 w-3.5" aria-hidden />,
  repeated_test: <BadgeCheck className="h-3.5 w-3.5" aria-hidden />,
};

const verificationTone: Record<VerificationStatus, Tone> = {
  unverified: "neutral",
  community_reported: "glaze",
  manufacturer_documented: "glaze",
  personally_tested: "ok",
  repeated_test: "ok",
};

/** Evidence level — always icon + text, never color alone. */
export function VerificationBadge({ status, short }: { status: VerificationStatus; short?: boolean }) {
  const v = vocab(useCopy()).VERIFICATION[status];
  return (
    <Badge tone={verificationTone[status]} icon={verificationIcon[status]} title={v.label}>
      {short ? v.short : v.label}
    </Badge>
  );
}

const riskTone = { low: "ok", medium: "warn", high: "danger", unknown: "neutral" } as const;

export function RiskBadge({ label, value }: { label: string; value: number | null }) {
  const v = vocab(useCopy());
  const level = riskLevel(value);
  return (
    <Badge
      tone={riskTone[level]}
      icon={level === "high" ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> : <Waves className="h-3.5 w-3.5" aria-hidden />}
    >
      {label}: {level === "unknown" ? "?" : v.riskLevel(level)}
    </Badge>
  );
}

export function DinnerwareBadge({ value }: { value: DinnerwareSuitability }) {
  const d = vocab(useCopy()).DINNERWARE[value];
  const tone: Tone = value === "verified" ? "ok" : value === "not_recommended" ? "danger" : value === "unknown" ? "neutral" : "glaze";
  return (
    <Badge tone={tone} title={d.hint}>
      {d.label}
    </Badge>
  );
}

/** 0–5 meter with an explicit numeric/text label. */
export function LevelMeter({ value, label }: { value: number | null; label: string }) {
  const copy = useCopy();
  const v = vocab(copy);
  const level = riskLevel(value);
  return (
    <div className="flex items-center gap-2" aria-label={copy.recipe.levelAria(label, value === null ? v.riskLevel("unknown") : String(value))}>
      <div className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-2 w-4 rounded-sm ${value !== null && i <= value ? (level === "high" ? "bg-danger" : level === "medium" ? "bg-warn" : "bg-ok") : "bg-line"}`}
          />
        ))}
      </div>
      <span className="text-xs text-ink-soft">{value === null ? v.riskLevel("unknown") : `${value}/5 · ${v.riskLevel(level)}`}</span>
    </div>
  );
}
