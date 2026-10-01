"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, getMessages, type Locale, type Messages } from "./index";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** The current UI dictionary, for client components. */
export function useCopy(): Messages {
  return getMessages(useContext(LocaleContext));
}
