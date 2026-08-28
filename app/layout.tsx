import type { Metadata, Viewport } from "next";
import { Bai_Jamjuree, Bungee, Chakra_Petch } from "next/font/google";
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

const baiJamjuree = Bai_Jamjuree({
  variable: "--font-bai-jamjuree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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

const siteUrl = new URL("https://cholo.meme");
const siteTitle = "$CHOLO | Primera memecoin de LATAM en Bitcoin";
const siteDescription =
  "$CHOLO es una memecoin cultural de LATAM en Bitcoin y Stacks, inspirada en el perro peruano sin pelo, con suministro de 8.9B tokens, arte coleccionable, billetera y comunidad.";
const ogImage = {
  url: "/cholo/cholo-surfer.png",
  width: 1280,
  height: 853,
  alt: "Arte CHOLO surfer para la comunidad $CHOLO",
};
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "$CHOLO",
  alternateName: "CHOLO",
  url: siteUrl.toString(),
  description: siteDescription,
  inLanguage: "es-PE",
  image: new URL(ogImage.url, siteUrl).toString(),
  publisher: {
    "@type": "Organization",
    name: "$CHOLO",
    url: siteUrl.toString(),
    logo: new URL("/cholo-min.png", siteUrl).toString(),
    sameAs: ["https://x.com/cholocoinmeme"],
  },
  about: {
    "@type": "Thing",
    name: "$CHOLO token",
    description: "Memecoin cultural de LATAM en Bitcoin y Stacks con suministro de 8.9B tokens.",
  },
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteTitle,
    template: "%s | $CHOLO",
  },
  description: siteDescription,
  applicationName: '$CHOLO',
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/android-chrome-192x192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  manifest: "/site.webmanifest",
  keywords: [
    "$CHOLO",
    "CHOLO token",
    "cholo memecoin",
    "memecoin LATAM",
    "Bitcoin memecoin",
    "Stacks token",
    "Bitcoin",
    "Stacks",
    "8.9B supply",
    "perro peruano sin pelo",
    "viringo peruano",
    "Peru crypto",
    "NFT CHOLO",
    "DeSci",
    "comunidad Bitcoin",
  ],
  authors: [{ name: "$CHOLO Team" }],
  creator: "$CHOLO",
  publisher: "$CHOLO",
  category: "cryptocurrency",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "/",
    title: siteTitle,
    description: siteDescription,
    siteName: "$CHOLO",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    creator: "@cholomemecoin",
    images: [ogImage],
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
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
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
      <body className={`${baiJamjuree.variable} ${chakraPetch.variable} ${bungee.variable} antialiased`}>
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
