import type { Metadata } from "next";
import { Providers } from "../providers";
import { TitleBar, WindowInitializer } from "@/components/layout";
import { SyncInitializer } from "@/components/sync";
import { FontBody } from "./font-body";
import "../globals.css";

export const metadata: Metadata = {
  title: "Cognia - AI Chat Assistant",
  description: "AI-powered assistant for chat, research, and automation",
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <FontBody>
        <Providers>
          <TitleBar />
          <WindowInitializer />
          <SyncInitializer />
          {children}
        </Providers>
      </FontBody>
    </html>
  );
}
