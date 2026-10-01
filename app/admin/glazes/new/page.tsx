import { Card, PageHeader } from "@/components/ui/primitives";
import { ActionForm } from "@/features/admin/action-form";
import { GlazeFields } from "@/features/admin/glaze-fields";
import { saveGlaze } from "@/features/admin/actions";
import { listBrands, listSeries } from "@/lib/data/catalog";

export default async function NewGlazePage() {
  const [brands, series] = await Promise.all([listBrands(true), listSeries()]);
  return (
    <>
      <PageHeader title="New glaze" />
      <Card className="max-w-3xl p-4 sm:p-5">
        <ActionForm action={saveGlaze} submitLabel="Create glaze">
          <GlazeFields brands={brands} series={series} />
        </ActionForm>
      </Card>
    </>
  );
}
