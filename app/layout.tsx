import type { Metadata, Viewport } from "next";
import { Inter, Chakra_Petch } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { GetInButton } from "@/components/GetIn";
import { Providers } from '@/components/ui/provider';
import { WalletProvider } from '@/components/WalletProvider';
import { Toaster } from "@/components/ui/sonner"
import AppLoadingProvider from "@/components/AppLoadingProvider";
import GlobalErrorHandler from "@/components/GlobalErrorHandler";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${chakraPetch.variable} antialiased`}>
        <GlobalErrorHandler />
        <WalletProvider>
          <Providers>
            <AppLoadingProvider>
              <Navbar />
              <GetInButton />
              <main >
                {children}
              </main>
            </AppLoadingProvider>
          </Providers>
        </WalletProvider>
        <Toaster />
      </body>
    </html>
  );
}
