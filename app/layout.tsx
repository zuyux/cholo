import type { Metadata } from "next";
import { Inter, Chakra_Petch } from "next/font/google";
import Link from "next/link";
import { GetInButton } from "@/components/GetIn";
import { Providers } from '@/components/ui/provider';
import { Toaster } from "@/components/ui/sonner"
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Kapu - Easy Wallet for BTC & L2s",
  description: "Kapu makes it effortless to create, manage, and use wallets for Bitcoin and Layer 2 networks. Instantly onboard, connect, and explore the world of BTC and L2s with a simple, secure experience.",
  keywords: "Bitcoin, L2, Layer 2, wallet, cryptocurrency, BTC, blockchain, DeFi",
  authors: [{ name: "Kapu Team" }],
  creator: "Kapu",
  publisher: "Kapu",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kapu.dev",
    title: "Kapu - Easy Wallet for BTC & L2s",
    description: "Kapu makes it effortless to create, manage, and use wallets for Bitcoin and Layer 2 networks.",
    siteName: "Kapu",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kapu - Easy Wallet for BTC & L2s",
    description: "Kapu makes it effortless to create, manage, and use wallets for Bitcoin and Layer 2 networks.",
    creator: "@kapu",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${chakraPetch.variable} antialiased`}>
        <Link href="/" className="fixed top-6 left-6 z-50">
          kapu
        </Link>
        <Providers>
          <>
            <GetInButton />
            {children}
          </>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
