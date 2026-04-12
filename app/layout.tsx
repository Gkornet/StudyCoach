import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyCoach – Wiskunde 3 VWO",
  description: "Jouw persoonlijke wiskundedocent voor 3 VWO",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
