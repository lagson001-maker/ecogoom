import { publicEnv } from "@/lib/env";
import type { Bucket } from "@/types/domain";

export const BUCKETS = {
  glaze: "public-glaze-assets",
  recipe: "public-recipe-assets",
  private: "private-user-assets",
} as const satisfies Record<string, Bucket>;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function isPublicBucket(bucket: Bucket): boolean {
  return bucket !== BUCKETS.private;
}

export function publicObjectUrl(bucket: Bucket, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${bucket}/${encoded}`;
}

/** Validates a storage path the client claims to have uploaded. */
export function isSafeStoragePath(path: string): boolean {
  return /^[A-Za-z0-9/_.-]{3,300}$/.test(path) && !path.includes("..") && !path.startsWith("/");
}

export function fileExtension(type: string): string {
  switch (type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return "jpg";
  }
}
