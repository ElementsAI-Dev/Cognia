import type { Metadata } from "next";
import { StandaloneThemeSyncProvider } from "@/components/providers/ui";
import { TooltipProvider } from "@/components/ui/tooltip";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Recording",
  description: "Recording Toolbar",
};

export default function RecordingToolbarLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-transparent">
      <body 
        className="overflow-hidden recording-toolbar-window bg-transparent"
        style={{
          backgroundColor: 'transparent',
          margin: 0,
          padding: 0,
        }}
      >
        <StandaloneThemeSyncProvider allowBackgroundImage={true}>
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        </StandaloneThemeSyncProvider>
      </body>
    </html>
  );
}
