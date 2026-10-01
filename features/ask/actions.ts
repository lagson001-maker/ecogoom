"use server";

import { getViewer } from "@/lib/data/auth";
import { runAsk, type AskOutcome } from "@/lib/ask/service";
import { bool, int, isUuid, oneOf, str } from "@/lib/forms";
import { isSafeStoragePath } from "@/lib/storage";
import { ATMOSPHERES, COLOR_TAGS, DESIRED_SURFACES, MOVEMENT_PREFERENCES, RISK_TOLERANCES } from "@/lib/vocabulary";
import { copy } from "@/lib/i18n";
import type { RecommendationConstraints } from "@/types/recommendation";

export type AskState = (AskOutcome & { ok: true }) | { ok: false; message: string } | null;

const ids = (fd: FormData, key: string) => fd.getAll(key).filter(isUuid).slice(0, 50);
const colors = (fd: FormData, key: string) =>
  fd.getAll(key).filter((v): v is string => typeof v === "string" && (COLOR_TAGS as readonly string[]).includes(v));

export async function askAction(_prev: AskState, fd: FormData): Promise<AskState> {
  const viewer = await getViewer();
  const text = str(fd, "text", 1000) ?? "";
  const imagePath = str(fd, "image_path", 300);
  if (!text && !imagePath) return { ok: false, message: "Describe what you want or add a reference image." };
  if (imagePath && !isSafeStoragePath(imagePath)) return { ok: false, message: copy.errors.invalidImage };

  const onlyMine = bool(fd, "only_my_glazes");
  if (onlyMine && !viewer.userId) return { ok: false, message: copy.ask.signInForInventory };

  const maxGlazes = int(fd, "max_glazes", 1, 4);
  const constraints: RecommendationConstraints = {
    maxGlazes: maxGlazes === 4 ? null : maxGlazes, // "4+" = no limit
    maxLayers: int(fd, "max_layers", 1, 8),
    desiredColorCount: int(fd, "desired_color_count", 1, 8),
    preferredBrandIds: ids(fd, "preferred_brands"),
    excludedBrandIds: ids(fd, "excluded_brands"),
    allowedGlazeIds: ids(fd, "allowed_glazes"),
    onlyMyGlazes: onlyMine,
    cone: int(fd, "cone", -22, 14),
    atmosphere: oneOf(str(fd, "atmosphere"), ATMOSPHERES.map((a) => a.value)),
    atmosphereRequired: bool(fd, "atmosphere_required"),
    clayBody: str(fd, "clay_body", 100),
    preferredColors: colors(fd, "preferred_colors"),
    avoidColors: colors(fd, "avoid_colors"),
    desiredSurface: fd
      .getAll("surface")
      .filter((v): v is RecommendationConstraints["desiredSurface"][number] => DESIRED_SURFACES.some((d) => d.value === v)),
    movement: oneOf(str(fd, "movement"), MOVEMENT_PREFERENCES.map((m) => m.value)),
    riskTolerance: oneOf(str(fd, "risk"), RISK_TOLERANCES.map((r) => r.value)) ?? "medium",
  };

  try {
    const outcome = await runAsk({ userId: viewer.userId, text, imagePath, constraints });
    return { ok: true, ...outcome };
  } catch (e) {
    console.error("[ask]", e);
    return { ok: false, message: copy.errors.unavailable };
  }
}
