import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/ui";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Cognia",
  description: "Assistant Bubble",
};

export default function AssistantBubbleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-transparent">
      <body 
        className="overflow-hidden assistant-bubble-window bg-transparent"
        style={{
          // Ensure true transparency on Windows
          backgroundColor: 'transparent',
          // Prevent any default background
          margin: 0,
          padding: 0,
        }}
      >
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
