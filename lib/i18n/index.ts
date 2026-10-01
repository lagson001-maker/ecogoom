import { en, type Messages } from "./en";
import { vi } from "./vi";

// Locale-neutral entry point, safe to import from server and client code.
// Server code gets the request's dictionary with `getCopy()` (lib/i18n/server),
// client components with `useCopy()` (lib/i18n/client).

export type Locale = "en" | "vi";
export const LOCALES: readonly Locale[] = ["en", "vi"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "glazestack_locale";

const dictionaries: Record<Locale, Messages> = { en, vi };

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "vi";
}

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}

/** Cookie wins; otherwise the first supported language in Accept-Language. */
export function resolveLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const lang = part.split(";")[0].trim().toLowerCase().slice(0, 2);
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

export type { Messages };
