'use client';

import Link from 'next/link';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { OPEN_AUTH_FLOW_EVENT } from '@/lib/authEvents';
import { OPEN_REWARD_CLAIM_EVENT } from '@/lib/rewardEvents';

export const Navbar = () => {
  const address = useCurrentAddress();

  return (
    <nav className="cholo-nav">
      <div className="cholo-nav-inner">
        <Link href="/" className="cholo-nav-brand"><span>$CHOLO<br /></span></Link>
        <div className="cholo-nav-links">
          <Link href="/#files">Historia</Link>
          <Link href="/#tokenomics">Tokenomics</Link>
          <Link href="/#gallery">Archivo</Link>
          <Link href="/wallet">Billetera</Link>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => window.dispatchEvent(new Event(address ? OPEN_REWARD_CLAIM_EVENT : OPEN_AUTH_FLOW_EVENT))}
          >
            Recompensa
          </button>
        </div>
      </div>
    </nav>
  )
}
