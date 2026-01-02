"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";

export default function ChatWidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-transparent">
        {children}
      </div>
    </ThemeProvider>
  );
}
