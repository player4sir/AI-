import type { Metadata } from "next";
import { Jura } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/app/components/ui/toaster";
import PlausibleProvider from "next-plausible";

const jura = Jura({
  subsets: ["latin"],
  variable: "--font-jura",
});

const title = "图像创作";
const description = "使用 AI 创作图像";
const url = "https://mz-4ghuy0411b96894a-1302342593.tcloudbaseapp.com/";
const ogimage = "https://mz-4ghuy0411b96894a-1302342593.tcloudbaseapp.com/og-image.png";
const sitename = "mzstd工作室";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    images: [ogimage],
    title,
    description,
    url: url,
    siteName: sitename,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: [ogimage],
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en" className="h-full">
        <head>
          <PlausibleProvider domain="logo-creator.io" />
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <meta name="color-scheme" content="dark" />
        </head>
        <body
          className={`${jura.variable} dark min-h-full bg-[#343434] font-jura antialiased`}
        >
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
