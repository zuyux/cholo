'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { queueWelcomeModalAfterSignIn, useWallet } from '@/components/WalletProvider';

export default function WelcomePage() {
  const { address } = useWallet();

  useEffect(() => {
    if (address) queueWelcomeModalAfterSignIn(address);
  }, [address]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <section className="w-full max-w-md border border-[#c18b4e]/45 bg-[#1b1412] p-8 text-center text-[#f1dfbd] shadow-2xl">
        <p className="cholo-kicker mb-3">Bienvenido a CHOLO</p>
        <h1 className="mb-4 text-3xl font-bold text-[#faeed5]">Cuenta lista</h1>
        <p className="mb-6 text-sm leading-6 text-[#bba58d]">
          Tu sesión ya está autenticada. Puedes revisar tu recompensa de bienvenida o continuar a tu billetera.
        </p>
        <Button asChild className="h-12 w-full bg-[#b7132f] text-[#faeed5] hover:bg-[#830c22]">
          <Link href="/wallet">
            <WalletCards className="mr-2" size={18} />
            Ir a mi billetera
          </Link>
        </Button>
      </section>
    </div>
  );
}
