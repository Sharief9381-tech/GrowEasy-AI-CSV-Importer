import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GrowEasy CSV Importer | AI-Powered CRM Lead Extraction",
  description:
    "Upload any CSV format and let AI intelligently extract and map your lead data to GrowEasy CRM fields.",
  keywords: ["CRM", "CSV Import", "Lead Management", "GrowEasy", "AI"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
