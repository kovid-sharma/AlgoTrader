import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const ibmSans = IBM_Plex_Sans({ variable: "--font-ibm", subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmMono = IBM_Plex_Mono({ variable: "--font-ibm-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = { title: "AutoTrade · Kotak Neo", description: "Kotak Neo Trade API dashboard" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${ibmSans.variable} ${ibmMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
