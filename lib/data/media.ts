import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import { isPublicBucket, publicObjectUrl } from "@/lib/storage";
import type { MediaAsset, MediaOwnerType, MediaWithUrl } from "@/types/domain";

const SIGNED_URL_TTL = 60 * 60; // 1h

/** Attach browser-usable URLs: public URL for public buckets, signed URL otherwise. */
export async function withUrls(supabase: ServerSupabase, media: MediaAsset[]): Promise<MediaWithUrl[]> {
  const privatePaths = media.filter((m) => !isPublicBucket(m.bucket)).map((m) => m.storage_path);
  const signed = new Map<string, string>();
  if (privatePaths.length) {
    const { data } = await supabase.storage.from("private-user-assets").createSignedUrls(privatePaths, SIGNED_URL_TTL);
    for (const row of data ?? []) if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
  }
  return media
    .map((m) => ({
      ...m,
      url: isPublicBucket(m.bucket) ? publicObjectUrl(m.bucket, m.storage_path) : (signed.get(m.storage_path) ?? ""),
    }))
    .filter((m) => m.url);
}

export async function getMediaFor(
  supabase: ServerSupabase,
  ownerType: MediaOwnerType,
  ownerIds: string[],
): Promise<Map<string, MediaWithUrl[]>> {
  const result = new Map<string, MediaWithUrl[]>();
  if (ownerIds.length === 0) return result;
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("owner_type", ownerType)
    .in("owner_id", ownerIds)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  const media = await withUrls(supabase, (data ?? []) as MediaAsset[]);
  for (const m of media) {
    const list = result.get(m.owner_id) ?? [];
    list.push(m);
    result.set(m.owner_id, list);
  }
  return result;
}
