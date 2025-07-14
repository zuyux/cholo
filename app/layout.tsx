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
  title: "kapu",
  description: "Easy wallet for BTC & L2s",
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
