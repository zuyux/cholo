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
  title: "$CHOLO - PRIMERA MEMECOIN DE LATAM EN BITCOIN",
  description: "$CHOLO es un token fungible en Stacks (7,000,000,000 unidades), inspirado en el perro peruano sin pelo, símbolo memético y patrimonio nacional. Financia DeSci, I+D y proyectos comunitarios open source.",
  keywords: "$CHOLO, Stacks, memecoin, DeSci, token, blockchain, comunidad, open source, Perú, perro peruano",
  authors: [{ name: "$CHOLO Team" }],
  creator: "$CHOLO",
  publisher: "$CHOLO",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "https://cholo.meme",
    title: "$CHOLO - PRIMERA MEMECOIN DE LATAM EN BITCOIN",
    description: "$CHOLO es un token fungible en Stacks (7,000,000,000 unidades), inspirado en el perro peruano sin pelo, símbolo memético y patrimonio nacional. Financia DeSci, I+D y proyectos comunitarios open source.",
    siteName: "$CHOLO",
  },
  twitter: {
    card: "summary_large_image",
    title: "$CHOLO - PRIMERA MEMECOIN DE LATAM EN BITCOIN",
    description: "$CHOLO es un token fungible en Stacks (7,000,000,000 unidades), inspirado en el perro peruano sin pelo, símbolo memético y patrimonio nacional. Financia DeSci, I+D y proyectos comunitarios open source.",
    creator: "@cholomemecoin",
  }
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
