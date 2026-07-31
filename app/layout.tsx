import type { Metadata, Viewport } from "next";
import { Bungee, Inter, Chakra_Petch } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { GetInButton } from "@/components/GetIn";
import { Providers } from '@/components/ui/provider';
import { WalletProvider } from '@/components/WalletProvider';
import { Toaster } from "@/components/ui/sonner"
import AppLoadingProvider from "@/components/AppLoadingProvider";
import GlobalErrorHandler from "@/components/GlobalErrorHandler";
import { I18nProvider } from "@/components/I18nProvider";
import { messages } from "@/lib/messages";
import RewardClaimModal from "@/components/RewardClaimModal";
import { EncryptedWalletProvider } from "@/components/EncryptedWalletProvider";
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

const bungee = Bungee({
  variable: "--font-bungee",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "$CHOLO - PRIMERA MEMECOIN DE LATAM EN BITCOIN",
  description: "$CHOLO es un token fungible en Stacks (7,000,000,000 unidades), inspirado en el perro peruano sin pelo, símbolo memético y patrimonio nacional. Financia DeSci, I+D y proyectos comunitarios open source.",
  applicationName: '$CHOLO',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/android-chrome-192x192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (!('theme' in localStorage) || localStorage.theme === 'dark' || (localStorage.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${chakraPetch.variable} ${bungee.variable} antialiased`}>
        <GlobalErrorHandler />
        <I18nProvider locale="es" messages={messages.es}>
          <WalletProvider>
            <EncryptedWalletProvider>
              <Providers>
                <AppLoadingProvider>
                  <Navbar />
                  <GetInButton />
                  <main>
                    {children}
                  </main>
                </AppLoadingProvider>
                <RewardClaimModal />
              </Providers>
            </EncryptedWalletProvider>
          </WalletProvider>
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
