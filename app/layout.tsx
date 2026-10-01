import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import "./globals.css";
import { BottomNav, MobileHeader, Sidebar } from "@/components/layout/nav";
import { getViewer } from "@/lib/data/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { copy } from "@/lib/i18n";
import { SetupNotice } from "@/components/layout/setup-notice";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext", "vietnamese"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin", "latin-ext", "vietnamese"] });

export const metadata: Metadata = {
  title: { default: copy.app.name, template: `%s · ${copy.app.name}` },
  description: copy.app.tagline,
};

export const viewport: Viewport = {
  themeColor: "#f6f2eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const configured = isSupabaseConfigured();
  const viewer = await getViewer();

  return (
    <html lang="en" className={`${geist.variable} ${fraunces.variable} antialiased`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-50 rounded bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
        >
          Skip to content
        </a>
        <Sidebar
          signedIn={Boolean(viewer.userId)}
          isEditor={viewer.isEditor}
          displayName={viewer.profile?.display_name ?? viewer.email}
        />
        <MobileHeader />
        <div className="md:pl-60">
          <main id="main" className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-8 lg:px-10">
            {configured ? children : <SetupNotice />}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
