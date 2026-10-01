import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Section } from "@/components/ui/primitives";
import { ActionForm } from "@/features/admin/action-form";
import { GlazeFields } from "@/features/admin/glaze-fields";
import { saveGlaze } from "@/features/admin/actions";
import { ImageUpload } from "@/features/media/image-upload";
import { MediaGallery } from "@/features/media/media-gallery";
import { getGlazeById, listBrands, listSeries } from "@/lib/data/catalog";
import { getMediaFor } from "@/lib/data/media";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/forms";

export default async function EditGlazePage({ params }: PageProps<"/admin/glazes/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [glaze, brands, series] = await Promise.all([getGlazeById(id), listBrands(true), listSeries()]);
  if (!glaze) notFound();
  const media = (await getMediaFor(await createClient(), "glaze", [glaze.id])).get(glaze.id) ?? [];

  return (
    <>
      <PageHeader
        title={`${glaze.brand.name} ${glaze.name}`}
        subtitle={
          <Link href={`/glazes/${glaze.slug}`} className="hover:underline">
            View public page
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="p-4 sm:p-5">
          <ActionForm action={saveGlaze}>
            <GlazeFields glaze={glaze} brands={brands} series={series} />
          </ActionForm>
        </Card>
        <Section title="Product images" className="mt-0">
          <div className="space-y-3">
            <MediaGallery media={media} canEdit revalidate={`/admin/glazes/${glaze.id}`} />
            <ImageUpload
              ownerType="glaze"
              ownerId={glaze.id}
              bucket="public-glaze-assets"
              folder={`glazes/${glaze.id}`}
              label="Add product image"
              revalidate={`/admin/glazes/${glaze.id}`}
            />
          </div>
        </Section>
      </div>
    </>
  );
}
