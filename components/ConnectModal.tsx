
import { LocalizedText } from '@/components/LocalizedText';
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { persistCachedWalletState, queueWelcomeModalAfterSignIn, useWallet, type WalletType } from './WalletProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Wallet, Mail } from 'lucide-react';
import { detectWalletExtensions } from '@/lib/detectWalletExtensions';
import { getWalletErrorMessage, isWalletRequestCancelled } from '@/lib/walletErrors';
import { connectOkxWallet } from '@/lib/okxWallet';
import { connectWalletConnect } from '@/lib/walletConnectWallet';
import {
  requestLeatherMainnetStacksAddress,
  requestLeatherStacksSignIn,
  requestXverseMainnetStacksAddress,
  requestXverseStacksSignIn,
} from '@/lib/stacksSignInMessage';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { useRouter } from 'next/navigation';
import { getConnectedAccountPasskeyByAddress, getConnectedAccountByAddress } from '@/lib/connectedAccountsApi';
import { decryptPortableEncryptedWallet, type WalletData } from '@/lib/encryptedStorage';
import ImportWalletModal from './ImportWalletModal';
// Password verification utility for settings changes
// Usage: await verifyPassphraseForSettings(address, passphrase, privateKey)
export async function verifyPassphraseForSettings(address: string, passphrase: string, privateKey: string): Promise<boolean> {
  try {
    // Fetch stored passkey hash from Supabase
    const storedPasskey = await getConnectedAccountPasskeyByAddress(address);
    if (!storedPasskey) return false;
    // Compute hash of privateKey + passphrase
    const inputHash = CryptoJS.SHA256(privateKey + passphrase).toString();
    // Compare with stored hash
    return storedPasskey === inputHash;
  } catch {
    return false;
  }
}
import CryptoJS from 'crypto-js';

declare global {
  interface Window {
    LeatherProvider?: unknown;
  }
}

interface ConnectModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (err: string) => void;
  initialConnectMode?: ConnectMode;
  embedded?: boolean;
}

type ConnectMode = 'wallets' | 'email' | 'import';

interface EmailAccountPayload {
  account: {
    email: string;
    address: string;
    passkey: string;
    encryptedPrivateKey: string;
    encryptedMnemonic: string;
    encryptionSalt: string;
    encryptionIv: string;
    encryptionVersion?: string;
    walletLabel?: string;
  };
}

interface EmailWalletLoginResponse {
  wallet: {
    address: string;
    privateKey: string;
    mnemonic: string;
    label?: string;
    bitcoinAddress?: string;
    rootstockAddress?: string;
    liquidAddress?: string;
  };
  account?: {
    email: string;
    address: string;
    walletLabel?: string;
  };
}

const isWalletLoginResponse = (payload: unknown): payload is EmailWalletLoginResponse => {
  if (!payload || typeof payload !== 'object') return false;
  const walletCandidate = (payload as EmailWalletLoginResponse).wallet;
  return Boolean(
    walletCandidate &&
    typeof walletCandidate.address === 'string' &&
    typeof walletCandidate.privateKey === 'string' &&
    typeof walletCandidate.mnemonic === 'string'
  );
};

const isEmailAccountPayload = (payload: unknown): payload is EmailAccountPayload => {
  if (!payload || typeof payload !== 'object') return false;
  const accountCandidate = (payload as EmailAccountPayload).account;
  return Boolean(
    accountCandidate &&
    typeof accountCandidate.address === 'string' &&
    typeof accountCandidate.passkey === 'string'
  );
};

// Destructure props at the top of your component
export default function ConnectModal({ onClose, onSuccess, onError, initialConnectMode, embedded = false }: ConnectModalProps) {
  const [connectMode, setConnectMode] = useState<ConnectMode>(initialConnectMode ?? 'wallets');
  const [wallets, setWallets] = useState<Array<{id: string, name: string, url: string, installed: boolean}>>([]);
  React.useEffect(() => {
    setWallets(
      [...detectWalletExtensions()]
        .filter((wallet) => wallet.id !== 'alby' && wallet.id !== 'nostria')
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }, []);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const [password, setPassword] = useState('');
  const { setAddress, setWalletType } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const { createEncryptedWallet } = useEncryptedWallet();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const persistSessionForWallet = useCallback(async (connectedAddress: string, providerType: WalletType) => {
    if (typeof window === 'undefined') return;

    persistCachedWalletState(connectedAddress, providerType);
    queueWelcomeModalAfterSignIn(connectedAddress);

    if (providerType !== 'imported') {
      try {
        const notificationResponse = await fetch('/api/wallet-connect/signed-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: connectedAddress,
            provider: providerType,
          }),
        });

        if (!notificationResponse.ok) {
          console.warn('Wallet connected, but the sign-in notification failed.');
        }
      } catch (notificationError) {
        console.warn('Wallet connected, but the sign-in notification failed:', notificationError);
      }
    }

    try {
      const existingAccount = await getConnectedAccountByAddress(connectedAddress);
      const sessionPayload = {
        address: connectedAddress,
        walletType: providerType,
        provider: providerType,
        connectedAt: Date.now(),
        existingAccount: Boolean(existingAccount),
        email: existingAccount?.email ?? null,
        accountId: existingAccount?.id ?? null,
      };
      localStorage.setItem('cholo_session', JSON.stringify(sessionPayload));
      window.dispatchEvent(new Event('cholo-session-update'));
    } catch (error) {
      console.warn('Failed to fetch connected account info, storing minimal session.', error);
      const fallbackPayload = {
        address: connectedAddress,
        walletType: providerType,
        provider: providerType,
        connectedAt: Date.now(),
      };
      localStorage.setItem('cholo_session', JSON.stringify(fallbackPayload));
      window.dispatchEvent(new Event('cholo-session-update'));
    }
  }, []);





  const handleEmailConnect = async () => {
    const identifier = email.trim();
    if (!identifier) {
      setEmailStatus('error');
      setEmailMessage('Ingresa tu usuario o correo electrónico');
      onError?.('Ingresa tu usuario o correo electrónico');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (identifier.includes('@') && !emailRegex.test(identifier)) {
      setEmailStatus('error');
      setEmailMessage('Ingresa un correo electrónico válido');
      onError?.('Ingresa un correo electrónico válido');
      return;
    }

    if (!password) {
      setEmailStatus('error');
      setEmailMessage('Ingresa tu contraseña');
      onError?.('Ingresa tu contraseña');
      return;
    }

    try {
      setIsLoading(true);
      setEmailStatus('loading');
      setEmailMessage('');

      const response = await fetch('/api/wallet-connect/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const message =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'No se pudo autenticar la cuenta';
        throw new Error(message);
      }

      let unlockedWallet: WalletData;

      if (isWalletLoginResponse(payload)) {
        unlockedWallet = {
          mnemonic: payload.wallet.mnemonic,
          privateKey: payload.wallet.privateKey,
          address: payload.wallet.address,
          label: payload.wallet.label || 'CHOLO Wallet',
          bitcoinAddress: payload.wallet.bitcoinAddress,
          rootstockAddress: payload.wallet.rootstockAddress,
          liquidAddress: payload.wallet.liquidAddress,
        };
      } else if (isEmailAccountPayload(payload)) {
        const account = payload.account;
        const walletPayload = {
          encryptedMnemonic: account.encryptedMnemonic,
          encryptedPrivateKey: account.encryptedPrivateKey,
          address: account.address,
          label: account.walletLabel || 'CHOLO Wallet',
          salt: account.encryptionSalt,
          iv: account.encryptionIv,
          version: account.encryptionVersion,
        };

        try {
          unlockedWallet = decryptPortableEncryptedWallet(walletPayload, password);
        } catch {
          throw new Error('El usuario, correo o contraseña no son válidos');
        }

        const passkeyHash = CryptoJS.SHA256(unlockedWallet.privateKey + password).toString();
        if (passkeyHash !== account.passkey) {
          throw new Error('El usuario, correo o contraseña no son válidos');
        }
      } else {
        throw new Error('No se pudo autenticar la cuenta');
      }

      await createEncryptedWallet(unlockedWallet, password);
      setAddress(unlockedWallet.address);
      setWalletType('imported');
      await persistSessionForWallet(unlockedWallet.address, 'imported');

      setPassword('');
      setEmailStatus('success');
      setEmailMessage('Billetera desbloqueada. Redirigiendo...');
      onSuccess?.();
      onClose();
      router.push('/wallet');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo autenticar la cuenta';
      setEmailStatus('error');
      setEmailMessage(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (typeof document === 'undefined') {
    return null;
  }

  const modalContent = (
    <div className={embedded
      ? "cholo-connect-modal cholo-connect-embedded w-full select-none"
      : "cholo-connect-modal fixed inset-0 flex items-center justify-center z-[201] select-none"
    }>
      <div className={embedded
        ? "cholo-connect-panel w-full !border-0 !shadow-none"
        : "cholo-connect-panel rounded-2xl w-[calc(100%_-_2rem)] max-w-[400px] max-h-[90vh] overflow-y-auto shadow-2xl"
      }>
        {/* Header */}
        {!embedded && <div className="flex items-center justify-between px-5">
          <h2 className="text-foreground text-xl font-semibold flex items-center">
            <Wallet className="w-5 h-5 mr-2" />
            {connectMode === 'import' ? 'Recuperar billetera' : connectMode === 'email' ? 'Iniciar sesión con usuario o correo' : 'Conectar billetera'}
          </h2>
          <button 
            onClick={onClose}
            className="text-[#a38870] hover:text-[#faeed5] transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>}

        <div className={connectMode === 'wallets' || embedded ? 'py-0' : 'px-5'}>
          {connectMode === "wallets" && (
            <>
              {(wallets.length === 0 || wallets.every(w => !w.installed && w.id !== 'walletconnect')) && (
                <div className="mb-2 text-[#c8b39a] text-sm">
                  <LocalizedText>You don&apos;t have unknown wallets in your browser that support this app. You need to install a wallet to proceed.
                </LocalizedText></div>
              )}
              <div className="space-y-3">
                {wallets.map(w => {
                  const canAttemptConnect = w.installed || w.id === 'walletconnect';
                  return (
                    <div key={w.id} className="relative flex w-full items-center rounded-[3px] border border-[#c18b4e]/20 bg-[#1b1412] px-4 py-3 transition-colors hover:bg-[#2a1d19]">
                      <div className="flex items-center gap-3">
                        <Image
                          src={w.id === "leather" ? '/leather.svg' : w.id === "xverse" ? '/xverse.svg' : w.id === "alby" ? '/alby.svg' : w.id === "nostria" ? '/nostria.svg' : w.id === "okx" ? '/okx.webp' : w.id === "walletconnect" ? '/wallet-connect.png' : ''}
                          alt={w.name}
                          width={28}
                          height={28}
                          className={`w-7 h-7 rounded ${w.id === 'xverse' ? 'p-1' : ''}`}
                          unoptimized
                        />
                        <div>
                          <div className="font-semibold text-[#faeed5]">{w.name}</div>
                          <div className="text-xs text-[#a38870]">{w.url.replace('https://', '')}</div>
                        </div>
                      </div>
                      {canAttemptConnect ? (
                      <Button
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        aria-label={`Conectar ${w.name}`}
                        onClick={async () => {
                            setWalletError(null);
                          try {
                            if (w.id === "leather" && window.LeatherProvider) {
                              const provider = window.LeatherProvider;
                              if (
                                provider &&
                                typeof provider === "object" &&
                                "request" in provider &&
                                typeof (provider as { request?: unknown }).request === "function"
                              ) {
                                const leatherProvider = provider as { request: (method: string, params?: unknown) => Promise<unknown> };
                                const stxAddress = await requestLeatherMainnetStacksAddress(leatherProvider);
                                await requestLeatherStacksSignIn(leatherProvider, stxAddress);
                                setAddress(stxAddress);
                                setWalletType('leather');
                                await persistSessionForWallet(stxAddress, 'leather');
                                onSuccess?.();
                                onClose();
                                router.push('/wallet');
                              } else {
                                const errorMsg = "Leather no admite esta solicitud. Desbloquea la billetera y actualiza la página.";
                                setWalletError(errorMsg);
                                onError?.(errorMsg);
                                console.warn('Leather provider does not support request.');
                              }
                            } else if (w.id === "xverse") {
                              try {
                                const stxAddress = await requestXverseMainnetStacksAddress();
                                await requestXverseStacksSignIn(stxAddress);
                                setAddress(stxAddress);
                                setWalletType('xverse');
                                await persistSessionForWallet(stxAddress, 'xverse');
                                onSuccess?.();
                                onClose();
                                router.push('/wallet');
                              } catch (err: unknown) {
                                const errorMsg = getWalletErrorMessage(err, 'No se pudo conectar con Xverse.');
                                if (isWalletRequestCancelled(err)) {
                                  setWalletError('Se canceló la conexión. Inténtalo de nuevo.');
                                  onError?.('Se canceló la conexión. Inténtalo de nuevo.');
                                } else {
                                  setWalletError(errorMsg);
                                  onError?.(errorMsg);
                                }
                                console.error('Xverse connect error:', err);
                              }
                            } else if (w.id === "okx") {
                              try {
                                const okxConnection = await connectOkxWallet();
                                setAddress(okxConnection.address);
                                setWalletType('okx');
                                await persistSessionForWallet(okxConnection.address, 'okx');
                                onSuccess?.();
                                onClose();
                                router.push('/wallet');
                              } catch (err: unknown) {
                                const errorMsg = getWalletErrorMessage(err, 'No se pudo conectar con OKX Wallet.');
                                if (isWalletRequestCancelled(err)) {
                                  setWalletError('Se canceló la conexión. Inténtalo de nuevo.');
                                  onError?.('Se canceló la conexión. Inténtalo de nuevo.');
                                } else {
                                  setWalletError(errorMsg);
                                  onError?.(errorMsg);
                                }
                                console.error('OKX Wallet connect error:', err);
                              }
                            } else if (w.id === "walletconnect") {
                              try {
                                const walletConnectConnection = await connectWalletConnect();
                                setAddress(walletConnectConnection.address);
                                setWalletType('walletconnect');
                                await persistSessionForWallet(walletConnectConnection.address, 'walletconnect');
                                onSuccess?.();
                                onClose();
                                router.push('/wallet');
                              } catch (err: unknown) {
                                const errorMsg = getWalletErrorMessage(err, 'No se pudo conectar con WalletConnect.');
                                if (isWalletRequestCancelled(err)) {
                                  setWalletError('Se canceló la conexión. Inténtalo de nuevo.');
                                  onError?.('Se canceló la conexión. Inténtalo de nuevo.');
                                } else {
                                  setWalletError(errorMsg);
                                  onError?.(errorMsg);
                                }
                                console.error('WalletConnect connect error:', err);
                              }
                            } else {
                              const errorMsg = "No se encontró el proveedor. Activa la extensión de tu billetera y actualiza la página.";
                              setWalletError(errorMsg);
                              onError?.(errorMsg);
                              console.warn('Wallet provider not found for:', w.id);
                            }
                          } catch (err: unknown) {
                            const msg = getWalletErrorMessage(err, 'No se pudo conectar la billetera.');
                            if (isWalletRequestCancelled(err)) {
                              const cancelMsg = "Se canceló la conexión. Inténtalo de nuevo.";
                              setWalletError(cancelMsg);
                              onError?.(cancelMsg);
                            } else {
                              setWalletError(msg);
                              onError?.(msg);
                            }
                            console.error('Wallet connect error:', err);
                          }
                        }}
                      >
                        Conectar
                      </Button>
                    ) : (
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 z-10 cursor-pointer opacity-0"
                        aria-label={`Instalar ${w.name}`}
                      >
                        Instalar →
                      </a>
                    )}
                  </div>
                  );
                })}
              </div>
              {walletError && (
                <div className="mt-4 px-4 py-3 rounded-[3px] bg-[#b7132f]/15 text-sm text-[#ef8396]">
                  {walletError}
                </div>
              )}
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-[#c18b4e]/25"></div>
                <span className="mx-2 text-xs text-[#a38870]">o</span>
                <div className="flex-grow border-t border-[#c18b4e]/25"></div>
              </div>
              <Button
                onClick={() => setConnectMode('email')}
                className="w-full h-12 rounded-[3px] bg-[#1b1412] text-[#f1dfbd] border border-[#c18b4e]/55 font-semibold text-base flex items-center px-4 hover:bg-[#2a1d19] cursor-pointer"
                type="button"
              >
                <Mail className="w-5 h-5 mr-2" />
                Iniciar sesión
              </Button>
            </>
          )}
          {connectMode === "email" && (
            <div className="space-y-2 text-[#f1dfbd]">
              <div className="space-y-0">
                <Label htmlFor="email" className="hidden">Usuario o correo</Label>
                <Input
                  id="email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Usuario o correo"
                  className="h-12 bg-[#1b1412] px-5 py-3 text-base text-[#faeed5] border-[#c18b4e]/45 focus-visible:border-[#c18b4e] focus-visible:ring-[#c18b4e]/25 focus-visible:ring-[3px]"
                />
              </div>
              <div className="space-y-0">
                <Label htmlFor="password" className="hidden">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="h-12 bg-[#1b1412] px-5 py-3 text-base text-[#faeed5] border-[#c18b4e]/45 focus-visible:border-[#c18b4e] focus-visible:ring-[#c18b4e]/25 focus-visible:ring-[3px]"
                />
              </div>
              <Button 
                onClick={handleEmailConnect} 
                disabled={!email || !password || isLoading} 
                className="w-full h-11 bg-[#b7132f] text-[#faeed5] hover:bg-[#830c22]"
              >
                {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
              {emailMessage && (
                <div className="text-sm" style={{ color: emailStatus === 'error' ? 'red' : 'green', marginTop: 8 }}>
                  {emailMessage}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setEmailMessage('');
                  setConnectMode('import');
                }}
                className="w-full pt-2 text-center text-sm font-medium text-foreground hover:text-foreground hover:underline cursor-pointer"
              >
                Recuperar con frase semilla
              </button>
            </div>
          )}
          {connectMode === 'import' && (
            <ImportWalletModal
              onBack={() => setConnectMode('email')}
              onImported={async (wallet, newPassword) => {
                await createEncryptedWallet(wallet, newPassword);
                setAddress(wallet.address);
                setWalletType('imported');
                await persistSessionForWallet(wallet.address, 'imported');
                onSuccess?.();
                onClose();
                router.push('/wallet');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );

  return embedded ? modalContent : createPortal(modalContent, document.body);
}
