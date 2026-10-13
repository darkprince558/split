import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Split",
  icons: {
    icon: [
      { url: "/favicon.ico?v=orange-arrow", type: "image/x-icon", sizes: "64x64" },
      { url: "/icon.svg?v=orange-arrow", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: "/icon.svg?v=orange-arrow",
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Split",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/opengraph-image.png", alt: "Split — Train your split step. Direction cues, feints, and reaction recordings." }],
  },
  appleWebApp: { capable: true, title: "Split", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-dvh bg-white font-sans text-black">
        {children}
      </body>
    </html>
  );
}
