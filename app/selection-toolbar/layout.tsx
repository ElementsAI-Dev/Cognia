import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import "../globals.css";

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
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="min-h-screen w-full overflow-auto bg-transparent">
        {/* 
          Selection toolbar window layout:
          - Dark theme for the floating toolbar appearance
          - Transparent background so Tauri window shadow works
          - Full window sizing to display toolbar content properly
          - Scrollable in debug mode where window is larger
        */}
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
          >
            <TooltipProvider delayDuration={0}>
              <main className="flex min-h-screen w-full items-start justify-center p-3">
                {children}
              </main>
            </TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
