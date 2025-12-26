import type { Metadata } from "next";
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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-transparent overflow-hidden">
        {children}
      </body>
    </html>
  );
}
