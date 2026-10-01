import { Card, PageHeader } from "@/components/ui/primitives";
import { ActionForm } from "@/features/admin/action-form";
import { GlazeFields } from "@/features/admin/glaze-fields";
import { saveGlaze } from "@/features/admin/actions";
import { listBrands, listSeries } from "@/lib/data/catalog";
import { getCopy } from "@/lib/i18n/server";

export default async function NewGlazePage() {
  const [brands, series, copy] = await Promise.all([listBrands(true), listSeries(), getCopy()]);
  return (
    <>
      <PageHeader title={copy.glaze.newGlaze} />
      <Card className="max-w-3xl p-4 sm:p-5">
        <ActionForm action={saveGlaze} submitLabel={copy.admin.createGlaze}>
          <GlazeFields brands={brands} series={series} />
        </ActionForm>
      </Card>
    </>
  );
}
