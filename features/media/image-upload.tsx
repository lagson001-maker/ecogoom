"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, fileExtension } from "@/lib/storage";
import { registerMedia } from "./actions";
import { copy } from "@/lib/i18n";
import type { Bucket, MediaOwnerType } from "@/types/domain";

export function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return copy.errors.invalidImage;
  if (file.size > MAX_IMAGE_BYTES) return copy.errors.invalidImage;
  return null;
}

/** Uploads directly from the browser to Storage (user session + Storage RLS). */
export async function uploadImage(file: File, bucket: Bucket, folder: string): Promise<{ path?: string; error?: string }> {
  const invalid = validateImage(file);
  if (invalid) return { error: invalid };
  const path = `${folder}/${crypto.randomUUID()}.${fileExtension(file.type)}`;
  const { error } = await createClient().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: `${copy.errors.uploadFailed} ${error.message}` };
  return { path };
}

export function ImageUpload({
  ownerType,
  ownerId,
  bucket,
  folder,
  label = copy.lab.uploadResult,
  revalidate,
}: {
  ownerType: MediaOwnerType;
  ownerId: string;
  bucket: Bucket;
  /** Storage folder. For the private bucket it must start with the user id. */
  folder: string;
  label?: string;
  revalidate?: string;
}) {
  const id = useId();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true);
    setError(null);
    for (const file of files) {
      const up = await uploadImage(file, bucket, folder);
      if (up.error || !up.path) {
        setError(up.error ?? copy.errors.uploadFailed);
        break;
      }
      const reg = await registerMedia({ ownerType, ownerId, bucket, path: up.path, altText: file.name, revalidate });
      if (reg.error) {
        setError(reg.error);
        break;
      }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line-strong bg-surface px-4 py-5 text-sm text-ink-soft hover:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
      >
        {busy ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <ImagePlus className="h-6 w-6" aria-hidden />}
        <span className="font-medium text-ink">{busy ? "Uploading…" : label}</span>
        <span className="text-xs text-muted">JPEG, PNG, WebP, AVIF · max 10 MB</span>
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        multiple
        className="sr-only"
        onChange={onChange}
        disabled={busy}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
