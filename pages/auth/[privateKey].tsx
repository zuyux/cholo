import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getStxAddress, generateWallet } from '@stacks/wallet-sdk';

export default function AuthWithPrivateKey() {
  const router = useRouter();
  const { privateKey } = router.query;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connectAndRedirect = async () => {
      if (typeof privateKey !== 'string') return;

      let address: string | undefined;
      let stxPrivateKey: string | undefined;

      // Try as mnemonic (seed phrase)
      try {
        const wallet = await generateWallet({ secretKey: privateKey.trim(), password: 'default-password' });
        const account = wallet.accounts[0];
        stxPrivateKey = account.stxPrivateKey;
        address = getStxAddress(account, 'mainnet');
      } catch {
        // If not a valid mnemonic, try as raw private key
        try {
          stxPrivateKey = privateKey.trim();
          const account = {
            stxPrivateKey,
            dataPrivateKey: '',
            salt: '',
            appsKey: '',
            index: 0,
          };
          address = getStxAddress(account, 'mainnet');
        } catch {
          address = undefined;
        }
      }

      if (!address) {
        setError('Invalid seed phrase or private key');
        return;
      }

      // Store session in localStorage (or cookies if needed)
      localStorage.setItem('ezstx_session', JSON.stringify({
        stxPrivateKey,
        address,
        createdAt: Date.now(),
      }));
      // Trigger GetInButton and other components to update
      window.dispatchEvent(new Event('ezstx-session-update'));
      window.dispatchEvent(new Event('storage')); // for cross-tab/component sync

      router.replace(`/${address}`);
    };

    connectAndRedirect();
  }, [privateKey, router]);

  return (
    <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Connecting to your account...</div>
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
    </div>
  );
}
