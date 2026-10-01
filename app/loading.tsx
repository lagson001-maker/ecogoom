import { getCopy } from "@/lib/i18n/server";

export default async function Loading() {
  const copy = await getCopy();
  return (
    <div aria-busy="true" aria-label={copy.common.loading} className="animate-pulse">
      <div className="mb-6 h-9 w-48 rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-[4/6] rounded-card bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
