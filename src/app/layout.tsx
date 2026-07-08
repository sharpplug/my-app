import type { Metadata, Viewport } from "next";
import { LanguageProvider } from "@/contexts/language-provider";
import RootLayoutClient from "@/components/layout/root-layout-client";
import { PT_Sans, Playfair_Display } from "next/font/google";

import "./globals.css";

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pt-sans",
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-playfair",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Moood - Your Vibe, Your World",
  description: "A social platform for sharing your mood and discovering local vibes.",
};

export const viewport: Viewport = {
  themeColor: "#e5eef2", // Matches the background color variable
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      suppressHydrationWarning 
      className={`${ptSans.variable} ${playfair.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://picsum.photos" />
        <link rel="preconnect" href="https://storage.googleapis.com" />
      </head>
      <body className="font-body antialiased bg-background">
        <LanguageProvider>
          <RootLayoutClient>{children}</RootLayoutClient>
        </LanguageProvider>
      </body>
    </html>
  );
}
