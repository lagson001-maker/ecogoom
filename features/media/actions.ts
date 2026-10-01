"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/auth";
import { isUuid } from "@/lib/forms";
import { BUCKETS, isSafeStoragePath } from "@/lib/storage";
import { copy } from "@/lib/i18n";
import type { Bucket, MediaOwnerType } from "@/types/domain";

const OWNER_TYPES: MediaOwnerType[] = ["glaze", "recipe", "experiment", "recommendation_reference"];
const ALL_BUCKETS: Bucket[] = [BUCKETS.glaze, BUCKETS.recipe, BUCKETS.private];

/**
 * Registers an object the browser already uploaded to Storage.
 * Storage RLS controlled the upload; media_assets RLS controls this insert.
 */
export async function registerMedia(input: {
  ownerType: MediaOwnerType;
  ownerId: string;
  bucket: Bucket;
  path: string;
  caption?: string | null;
  altText?: string | null;
  sourceUrl?: string | null;
  sourceCredit?: string | null;
  revalidate?: string;
}): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer.userId) return { error: copy.auth.required };
  if (!OWNER_TYPES.includes(input.ownerType) || !ALL_BUCKETS.includes(input.bucket) || !isUuid(input.ownerId)) {
    return { error: copy.errors.generic };
  }
  if (!isSafeStoragePath(input.path)) return { error: copy.errors.invalidImage };
  if (input.bucket === BUCKETS.private && !input.path.startsWith(`${viewer.userId}/`)) {
    return { error: copy.errors.unauthorized };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("media_assets")
    .select("*", { count: "exact", head: true })
    .eq("owner_type", input.ownerType)
    .eq("owner_id", input.ownerId);

  const { error } = await supabase.from("media_assets").insert({
    owner_type: input.ownerType,
    owner_id: input.ownerId,
    bucket: input.bucket,
    storage_path: input.path,
    caption: input.caption?.slice(0, 300) || null,
    alt_text: input.altText?.slice(0, 300) || null,
    source_url: input.sourceUrl?.slice(0, 1000) || null,
    source_credit: input.sourceCredit?.slice(0, 200) || null,
    is_primary: (count ?? 0) === 0,
    created_by: viewer.userId,
  });
  if (error) {
    // Don't leave an orphaned object behind.
    await supabase.storage.from(input.bucket).remove([input.path]);
    return { error: error.code === "42501" ? copy.errors.unauthorized : error.message };
  }
  if (input.ownerType === "glaze") {
    await supabase.from("glazes").update({ image_path: input.path }).eq("id", input.ownerId).is("image_path", null);
  }
  if (input.revalidate?.startsWith("/")) revalidatePath(input.revalidate);
  return {};
}

export async function deleteMedia(id: string, revalidate?: string): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer.userId || !isUuid(id)) return { error: copy.errors.unauthorized };
  const supabase = await createClient();
  const { data: media } = await supabase.from("media_assets").select("*").eq("id", id).maybeSingle();
  if (!media) return { error: copy.errors.notFound };
  const { error } = await supabase.from("media_assets").delete().eq("id", id);
  if (error) return { error: error.message };
  await supabase.storage.from(media.bucket).remove([media.storage_path]);
  if (revalidate?.startsWith("/")) revalidatePath(revalidate);
  return {};
}

export async function setPrimaryMedia(id: string, revalidate?: string): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer.userId || !isUuid(id)) return { error: copy.errors.unauthorized };
  const supabase = await createClient();
  const { data: media } = await supabase.from("media_assets").select("owner_type, owner_id").eq("id", id).maybeSingle();
  if (!media) return { error: copy.errors.notFound };
  await supabase.from("media_assets").update({ is_primary: false }).eq("owner_type", media.owner_type).eq("owner_id", media.owner_id);
  const { error } = await supabase.from("media_assets").update({ is_primary: true }).eq("id", id);
  if (error) return { error: error.message };
  if (revalidate?.startsWith("/")) revalidatePath(revalidate);
  return {};
}
