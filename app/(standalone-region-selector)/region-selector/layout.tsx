import type { Metadata } from "next";
import { StandaloneThemeSyncProvider } from "@/components/providers/ui";
import { I18nProvider } from "@/lib/i18n";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Region Selector",
  description: "Screen region selection overlay",
};

export default function RegionSelectorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className="min-h-screen w-full overflow-hidden" 
        style={{ background: 'transparent' }}
      >
        {/* 
          Region selector window layout:
          - Full-screen transparent overlay
          - Dark theme for the selection UI elements
          - No padding or margin - covers entire screen
        */}
        <I18nProvider>
          <StandaloneThemeSyncProvider
            allowBackgroundImage={false}
            forceTransparent={true}
          >
            <main className="fixed inset-0 w-full h-full">
              {children}
            </main>
          </StandaloneThemeSyncProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
