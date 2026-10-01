import { Search } from "lucide-react";
import { copy } from "@/lib/i18n";

/** GET search that resets filters' page but keeps nothing else — free text drives the query. */
export function SearchBar({ defaultValue, action = "/" }: { defaultValue: string; action?: string }) {
  return (
    <form action={action} method="get" role="search" className="relative flex-1">
      <label htmlFor="q" className="sr-only">
        {copy.common.search}
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={copy.discover.searchPlaceholder}
        className="h-12 w-full rounded-xl border border-line-strong bg-surface pl-10 pr-3 text-base text-ink placeholder:text-muted focus-visible:border-focus"
      />
    </form>
  );
}
