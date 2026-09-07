'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { SiX } from 'react-icons/si';

export function ProfileProviderLogos({ address }: { address: string }) {
  const [google, setGoogle] = useState(false);
  const [socials, setSocials] = useState({ x: false, instagram: false });

  useEffect(() => {
    const controller = new AbortController();
    let revision = 0;
    const refresh = async () => {
      const currentRevision = ++revision;
      try {
        const session = JSON.parse(localStorage.getItem('cholo_session') || 'null');
        setGoogle(typeof session?.address === 'string'
          && session.address.toLowerCase() === address.toLowerCase()
          && session.provider === 'google');
      } catch {
        setGoogle(false);
      }

      try {
        const response = await fetch('/api/rewards/social-status', {
          cache: 'no-store', signal: controller.signal,
        });
        const status = response.ok ? await response.json() : null;
        if (controller.signal.aborted || currentRevision !== revision) return;
        const matches = typeof status?.address === 'string'
          && status.address.toLowerCase() === address.toLowerCase();
        setSocials({
          x: matches && status.x?.connected === true,
          instagram: matches && status.instagram?.connected === true,
        });
      } catch {
        if (!controller.signal.aborted && currentRevision === revision) {
          setSocials({ x: false, instagram: false });
        }
      }
    };

    void refresh();
    window.addEventListener('cholo-session-update', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      window.removeEventListener('cholo-session-update', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [address]);

  if (!google && !socials.x && !socials.instagram) return null;

  return (
    <div className="mb-5 flex items-center justify-center gap-3" role="group" aria-label="Connected accounts">
      {google && <span title="Google connected"><Image src="/google-ico.svg" alt="Google connected" width={20} height={20} unoptimized /></span>}
      {socials.x && <span title="X connected"><SiX size={20} role="img" aria-label="X connected" /></span>}
      {socials.instagram && <span title="Instagram connected"><Image src="/instagram.svg" alt="Instagram connected" width={20} height={20} unoptimized /></span>}
    </div>
  );
}
