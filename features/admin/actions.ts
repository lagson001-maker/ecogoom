"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/auth";
import { bool, int, isUuid, oneOf, str, tags, type ActionState } from "@/lib/forms";
import { slugify } from "@/lib/utils";
import { OPACITIES } from "@/lib/vocabulary";
import { getCopy } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n";
import type { Atmosphere, ClayColor, Role, SourceType, VerificationStatus } from "@/types/domain";

async function requireEditorAction(): Promise<string | null> {
  const viewer = await getViewer();
  return viewer.userId && viewer.isEditor ? viewer.userId : null;
}

/** Hotlinked images must be https; anything else is dropped rather than stored. */
const httpsUrl = (u: string | null) => (u && /^https:\/\/\S+$/.test(u) ? u : null);

const done = (message: string): ActionState => ({ ok: true, message });
const fail = (message: string): ActionState => ({ ok: false, message });
const dbMessage = (e: { code?: string; message: string }, copy: Messages) =>
  e.code === "23505" ? copy.admin.duplicateName : e.code === "42501" ? copy.errors.unauthorized : e.message;

// --- brands & series -----------------------------------------------------------

export async function saveBrand(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const copy = await getCopy();
  if (!(await requireEditorAction())) return fail(copy.errors.unauthorized);
  const id = str(fd, "id");
  const name = str(fd, "name", 120);
  if (!name) return fail(copy.admin.nameRequired);
  const record = {
    name,
    slug: slugify(str(fd, "slug", 80) ?? name),
    website_url: str(fd, "website_url", 500),
    country: str(fd, "country", 60),
    description: str(fd, "description", 2000),
    active: id ? bool(fd, "active") : true,
  };
  const supabase = await createClient();
  const { error } = id && isUuid(id)
    ? await supabase.from("brands").update(record).eq("id", id)
    : await supabase.from("brands").insert(record);
  if (error) return fail(dbMessage(error, copy));
  revalidatePath("/admin/brands");
  revalidatePath("/brands");
  return done(copy.admin.savedMsg);
}

export async function saveSeries(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const copy = await getCopy();
  if (!(await requireEditorAction())) return fail(copy.errors.unauthorized);
  const brandId = str(fd, "brand_id");
  const name = str(fd, "name", 120);
  if (!isUuid(brandId) || !name) return fail(copy.admin.brandNameRequired);
  const supabase = await createClient();
  const { error } = await supabase.from("glaze_series").insert({ brand_id: brandId, name, slug: slugify(name) });
  if (error) return fail(dbMessage(error, copy));
  revalidatePath("/admin/brands");
  return done(copy.admin.seriesAdded);
}

// --- glazes ----------------------------------------------------------------------

export async function saveGlaze(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const copy = await getCopy();
  if (!(await requireEditorAction())) return fail(copy.errors.unauthorized);
  const id = str(fd, "id");
  const name = str(fd, "name", 120);
  const brandId = str(fd, "brand_id");
  if (!name || !isUuid(brandId)) return fail(copy.admin.brandNameRequired);
  const seriesId = str(fd, "series_id");
  const swatch = str(fd, "swatch_hex", 7);
  const foodSafe = str(fd, "manufacturer_food_safe_claim");

  const supabase = await createClient();
  const { data: brand } = await supabase.from("brands").select("slug").eq("id", brandId).single();
  const record = {
    brand_id: brandId,
    series_id: isUuid(seriesId) ? seriesId : null,
    product_code: str(fd, "product_code", 40),
    name,
    slug: slugify(str(fd, "slug", 100) ?? `${brand?.slug ?? ""}-${name}`),
    glaze_type: slugify(str(fd, "glaze_type", 40) ?? "glaze").replace(/-/g, "_"),
    base_color: str(fd, "base_color", 120),
    swatch_hex: swatch && /^#[0-9a-fA-F]{6}$/.test(swatch) ? swatch : null,
    color_family: str(fd, "color_family", 40)?.toLowerCase() ?? null,
    color_tags: tags(fd, "color_tags"),
    finish: str(fd, "finish", 60),
    opacity: oneOf(str(fd, "opacity"), OPACITIES),
    cone_min: int(fd, "cone_min", -22, 14),
    cone_max: int(fd, "cone_max", -22, 14),
    // Only record what the manufacturer actually states. Empty = unknown.
    manufacturer_food_safe_claim: foodSafe === "yes" ? true : foodSafe === "no" ? false : null,
    manufacturer_notes: str(fd, "manufacturer_notes", 4000),
    official_url: str(fd, "official_url", 1000),
    coats_min: int(fd, "coats_min", 1, 10),
    coats_max: int(fd, "coats_max", 1, 10),
    application_notes: str(fd, "application_notes", 2000),
    image_url: httpsUrl(str(fd, "image_url", 1000)),
    image_credit: str(fd, "image_credit", 200),
    active: id ? bool(fd, "active") : true,
  };

  if (record.coats_min !== null && record.coats_max !== null && record.coats_min > record.coats_max) {
    [record.coats_min, record.coats_max] = [record.coats_max, record.coats_min];
  }
  if (id && isUuid(id)) {
    const { error } = await supabase.from("glazes").update(record).eq("id", id);
    if (error) return fail(dbMessage(error, copy));
    revalidatePath(`/admin/glazes/${id}`);
    revalidatePath("/glazes");
    return done(copy.admin.savedMsg);
  }
  const { data, error } = await supabase.from("glazes").insert(record).select("id").single();
  if (error) return fail(dbMessage(error, copy));
  revalidatePath("/glazes");
  redirect(`/admin/glazes/${data.id}`);
}

// --- sources -----------------------------------------------------------------------

const SOURCE_TYPES: SourceType[] = ["manufacturer", "community", "personal", "imported", "unknown"];
const EVIDENCE: VerificationStatus[] = ["unverified", "community_reported", "manufacturer_documented", "personally_tested", "repeated_test"];

export async function saveSource(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const copy = await getCopy();
  const userId = await requireEditorAction();
  if (!userId) return fail(copy.errors.unauthorized);
  const id = str(fd, "id");
  const name = str(fd, "name", 200);
  if (!name) return fail(copy.admin.nameRequired);
  const record = {
    name,
    url: str(fd, "url", 1000),
    author: str(fd, "author", 200),
    source_date: str(fd, "source_date", 10),
    source_type: oneOf(str(fd, "source_type"), SOURCE_TYPES) ?? "unknown",
    evidence_level: oneOf(str(fd, "evidence_level"), EVIDENCE) ?? "unverified",
    notes: str(fd, "notes", 4000),
  };
  const supabase = await createClient();
  const { error } = id && isUuid(id)
    ? await supabase.from("sources").update(record).eq("id", id)
    : await supabase.from("sources").insert({ ...record, created_by: userId });
  if (error) return fail(dbMessage(error, copy));
  revalidatePath("/admin/sources");
  revalidatePath("/sources");
  return done(copy.admin.savedMsg);
}

// --- users -------------------------------------------------------------------------

export async function setUserRole(fd: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer.isAdmin) return;
  const id = str(fd, "id");
  const role = oneOf(str(fd, "role"), ["user", "editor", "admin"] as Role[]);
  if (!isUuid(id) || !role || id === viewer.userId) return; // never demote yourself by accident
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/admin/users");
}

// --- glaze results on clay bodies ------------------------------------------------

const CLAY_COLORS: ClayColor[] = ["white", "buff", "speckled", "brown", "red", "dark", "porcelain", "other"];
const ATMOSPHERE_VALUES: Atmosphere[] = ["oxidation", "reduction", "neutral", "wood", "soda", "salt", "raku", "unknown"];

export async function saveClayResult(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const copy = await getCopy();
  if (!(await requireEditorAction())) return fail(copy.errors.unauthorized);
  const glazeId = str(fd, "glaze_id");
  const clayColor = oneOf(str(fd, "clay_color"), CLAY_COLORS);
  const description = str(fd, "result_description", 2000);
  const rawSource = str(fd, "source_url", 1000);
  const sourceUrl = rawSource && /^https?:\/\/\S+$/.test(rawSource) ? rawSource : null;
  if (!isUuid(glazeId) || !clayColor || !description) return fail(copy.catalog.clayResultRequired);
  // Provenance is required: a result without a source is not recorded.
  if (!sourceUrl) return fail(copy.catalog.sourceRequired);

  const supabase = await createClient();
  const { error } = await supabase.from("glaze_clay_results").insert({
    glaze_id: glazeId,
    clay_color: clayColor,
    clay_body_text: str(fd, "clay_body_text", 120),
    cone: int(fd, "cone", -22, 14),
    atmosphere: oneOf(str(fd, "atmosphere"), ATMOSPHERE_VALUES),
    coats: int(fd, "coats", 1, 10),
    result_description: description,
    image_url: httpsUrl(str(fd, "image_url", 1000)),
    image_credit: str(fd, "image_credit", 200),
    source_url: sourceUrl,
    verification_status: oneOf(str(fd, "verification_status"), EVIDENCE) ?? "unverified",
  });
  if (error) return fail(dbMessage(error, copy));
  revalidatePath("/glazes", "layout");
  revalidatePath(`/admin/glazes/${glazeId}`);
  return done(copy.admin.savedMsg);
}

export async function deleteClayResult(id: string, glazeId: string): Promise<void> {
  if (!(await requireEditorAction()) || !isUuid(id) || !isUuid(glazeId)) return;
  const supabase = await createClient();
  await supabase.from("glaze_clay_results").delete().eq("id", id);
  revalidatePath("/glazes", "layout");
  revalidatePath(`/admin/glazes/${glazeId}`);
}
