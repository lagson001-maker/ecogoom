import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, getMessages, resolveLocale, type Locale, type Messages } from "./index";

/** The request's locale. Cached per request. */
export const getLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get("accept-language"));
});

/** The request's UI dictionary, for server components and server functions. */
export async function getCopy(): Promise<Messages> {
  return getMessages(await getLocale());
}
