import { ArrowUpRight } from "lucide-react";
import { publicObjectUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Messages } from "@/lib/i18n";
import type { Glaze } from "@/types/domain";

type ImageGlaze = Pick<Glaze, "name" | "swatch_hex" | "image_url" | "image_credit" | "image_path" | "official_url">;

/**
 * The manufacturer's own image, hotlinked from their site with a credit line.
 * It is never copied into our storage. Without one, a swatch block that is
 * clearly labelled as approximate.
 */
export function GlazeImage({ glaze, copy, className }: { glaze: ImageGlaze; copy: Messages; className?: string }) {
  const src = glaze.image_url ?? (glaze.image_path ? publicObjectUrl("public-glaze-assets", glaze.image_path) : null);
  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <div
        className="relative aspect-square overflow-hidden rounded-card border border-line"
        style={{ background: glaze.swatch_hex ?? "#d9cbb7" }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- hotlinked from the manufacturer's host, not optimisable
          <img
            src={src}
            alt={copy.glaze.productImage(glaze.name)}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/20" aria-hidden />
        )}
      </div>
      <figcaption className="text-xs text-muted">
        {glaze.image_url ? (
          <>
            {copy.catalog.imageCredit(glaze.image_credit ?? copy.catalog.manufacturer)}
            {glaze.official_url && (
              <a
                href={glaze.official_url}
                target="_blank"
                rel="noreferrer nofollow"
                className="ml-1 inline-flex items-center gap-0.5 text-glaze hover:underline"
              >
                {copy.sources.open} <ArrowUpRight className="h-3 w-3" aria-hidden />
              </a>
            )}
          </>
        ) : (
          copy.inventory.swatchNote
        )}
      </figcaption>
    </figure>
  );
}
