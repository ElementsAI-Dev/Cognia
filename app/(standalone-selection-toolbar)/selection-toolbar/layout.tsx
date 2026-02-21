import type { Metadata } from "next";
import { StandaloneThemeSyncProvider } from "@/components/providers/ui";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Selection Toolbar",
  description: "AI-powered selection toolbar",
};

export default function SelectionToolbarLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen w-full overflow-hidden bg-transparent" style={{ background: 'transparent' }}>
        {/* 
          Selection toolbar window layout:
          - Dark theme for the floating toolbar appearance
          - Transparent background so Tauri window shadow works
          - Full window sizing to display toolbar content properly
          - Scrollable in debug mode where window is larger
        */}
        <I18nProvider>
          <StandaloneThemeSyncProvider
            allowBackgroundImage={false}
            forceTransparent={true}
          >
            <TooltipProvider delayDuration={0}>
              <main className="flex min-h-screen w-full items-start justify-center p-3">
                {children}
              </main>
            </TooltipProvider>
          </StandaloneThemeSyncProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
