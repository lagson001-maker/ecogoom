"use client";

import Image from "next/image";
import { Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteMedia, setPrimaryMedia } from "./actions";
import type { MediaWithUrl } from "@/types/domain";

export function MediaGallery({
  media,
  canEdit,
  revalidate,
}: {
  media: MediaWithUrl[];
  canEdit: boolean;
  revalidate?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (media.length === 0) return null;

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.error) alert(res.error);
      router.refresh();
    });

  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy={pending}>
      {media.map((m) => (
        <li key={m.id} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-2">
          <a href={m.url} target="_blank" rel="noreferrer">
            <Image src={m.url} alt={m.alt_text ?? m.caption ?? "Result photo"} fill sizes="200px" className="object-cover" />
          </a>
          {m.is_primary && (
            <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">Cover</span>
          )}
          {canEdit && (
            <div className="absolute bottom-1 right-1 flex gap-1">
              {!m.is_primary && (
                <button
                  type="button"
                  onClick={() => run(() => setPrimaryMedia(m.id, revalidate))}
                  className="flex h-8 w-8 items-center justify-center rounded bg-surface/90 text-ink shadow"
                  aria-label="Use as cover photo"
                >
                  <Star className="h-4 w-4" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (confirm("Delete this photo?")) run(() => deleteMedia(m.id, revalidate));
                }}
                className="flex h-8 w-8 items-center justify-center rounded bg-surface/90 text-danger shadow"
                aria-label="Delete photo"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
