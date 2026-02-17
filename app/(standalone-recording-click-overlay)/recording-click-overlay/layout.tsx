import type { Metadata } from "next";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Recording Click Overlay",
  description: "Recording click highlight overlay",
};

export default function RecordingClickOverlayLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-transparent">
      <body
        className="overflow-hidden bg-transparent"
        style={{
          backgroundColor: "transparent",
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
