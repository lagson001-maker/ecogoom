import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { AskForm } from "@/features/ask/ask-form";
import { getViewer } from "@/lib/data/auth";
import { getGlazeOptions, listBrands } from "@/lib/data/catalog";
import { isAIConfigured } from "@/lib/ai";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.ask.title };
}

export default async function AskPage({ searchParams }: PageProps<"/ask">) {
  const copy = await getCopy();
  const sp = await searchParams;
  const [viewer, brands, glazes] = await Promise.all([getViewer(), listBrands(), getGlazeOptions()]);

  return (
    <div className="max-w-4xl">
      <PageHeader title={copy.ask.title} subtitle={copy.ask.subtitle} />
      <AskForm
        userId={viewer.userId}
        aiConfigured={isAIConfigured()}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        glazes={glazes}
        defaultText={typeof sp.q === "string" ? sp.q : ""}
        defaultOnlyMine={sp.mine === "1"}
      />
    </div>
  );
}
