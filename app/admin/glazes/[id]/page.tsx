import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Section } from "@/components/ui/primitives";
import { ActionForm } from "@/features/admin/action-form";
import { GlazeFields } from "@/features/admin/glaze-fields";
import { deleteClayResult, deletePairing, saveClayResult, savePairing, saveGlaze } from "@/features/admin/actions";
import { PairingFields } from "@/features/admin/pairing-fields";
import { PairingLists } from "@/features/catalog/pairings";
import { orientPairing, type OrientedPairing } from "@/lib/pairings";
import { ClayResultFields } from "@/features/admin/clay-result-fields";
import { ClayResultList } from "@/features/catalog/clay-results";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImageUpload } from "@/features/media/image-upload";
import { MediaGallery } from "@/features/media/media-gallery";
import { getClayResults, getGlazeById, getPairings, listBrands, listGlazes, listSeries } from "@/lib/data/catalog";
import { getMediaFor } from "@/lib/data/media";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/forms";
import { getCopy } from "@/lib/i18n/server";

export default async function EditGlazePage({ params }: PageProps<"/admin/glazes/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [glaze, brands, series, copy] = await Promise.all([getGlazeById(id), listBrands(true), listSeries(), getCopy()]);
  if (!glaze) notFound();
  const [mediaMap, clayResults, pairingData, allGlazes] = await Promise.all([
    getMediaFor(await createClient(), "glaze", [glaze.id]),
    getClayResults([glaze.id]),
    getPairings([glaze.id]),
    listGlazes({ includeInactive: true }),
  ]);
  const pairings = pairingData.pairings
    .map((x) => orientPairing(x, glaze.id, pairingData.glazes))
    .filter((x): x is OrientedPairing => x !== null);
  const media = mediaMap.get(glaze.id) ?? [];
  const results = clayResults.get(glaze.id) ?? [];

  return (
    <>
      <PageHeader
        title={`${glaze.brand.name} ${glaze.name}`}
        subtitle={
          <Link href={`/glazes/${glaze.slug}`} className="hover:underline">
            {copy.admin.viewPublic}
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="p-4 sm:p-5">
          <ActionForm action={saveGlaze}>
            <GlazeFields glaze={glaze} brands={brands} series={series} />
          </ActionForm>
        </Card>
        <Section title={copy.admin.productImages} className="mt-0">
          <div className="space-y-3">
            <MediaGallery media={media} canEdit revalidate={`/admin/glazes/${glaze.id}`} />
            <ImageUpload
              ownerType="glaze"
              ownerId={glaze.id}
              bucket="public-glaze-assets"
              folder={`glazes/${glaze.id}`}
              label={copy.admin.addProductImage}
              revalidate={`/admin/glazes/${glaze.id}`}
            />
          </div>
        </Section>
      </div>

      <Section title={copy.pairing.title}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <PairingLists pairings={pairings} copy={copy} />
            {pairings.map(({ pairing, partner }) => (
              <form key={pairing.id} action={deletePairing.bind(null, pairing.id, glaze.id)} className="inline-block">
                <SubmitButton variant="ghost" size="sm" className="text-danger" confirmMessage={copy.common.confirmDelete}>
                  {copy.pairing.delete}: {partner.name}
                </SubmitButton>
              </form>
            ))}
          </div>
          <Card className="p-4 sm:p-5">
            <h3 className="mb-3 font-serif text-lg font-semibold">{copy.pairing.add}</h3>
            <ActionForm action={savePairing} submitLabel={copy.pairing.add}>
              <PairingFields glazeId={glaze.id} glazes={allGlazes} copy={copy} />
            </ActionForm>
          </Card>
        </div>
      </Section>

      <Section title={copy.catalog.onClayBodies}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <ClayResultList results={results} copy={copy} />
            {results.map((r) => (
              <form key={r.id} action={deleteClayResult.bind(null, r.id, glaze.id)} className="inline-block">
                <SubmitButton variant="ghost" size="sm" className="text-danger" confirmMessage={copy.common.confirmDelete}>
                  {copy.catalog.deleteResult}: {r.clay_body_text ?? r.clay_color}
                </SubmitButton>
              </form>
            ))}
          </div>
          <Card className="p-4 sm:p-5">
            <h3 className="mb-3 font-serif text-lg font-semibold">{copy.catalog.addClayResult}</h3>
            <ActionForm action={saveClayResult} submitLabel={copy.catalog.addClayResult}>
              <ClayResultFields glazeId={glaze.id} copy={copy} />
            </ActionForm>
          </Card>
        </div>
      </Section>
    </>
  );
}
