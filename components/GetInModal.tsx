import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { useWallet } from './WalletProvider';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CircleHelp, X, Shield } from 'lucide-react';
import { createStacksAccount } from '@/lib/stacksWallet';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '@/components/PasswordInput';
import ConnectModal from './ConnectModal';
import { formatStxAddress } from '@/lib/address-utils';

export default function GetInModal({ onClose }: { onClose?: () => void }) {
  const { address } = useWallet();
  const { 
    isWalletEncrypted, 
    isAuthenticated: isEncryptedAuthenticated,
    isSessionLocked,
    createEncryptedWallet,
    unlockWallet,
    authError: encryptedAuthError,
    isLoading: encryptedLoading,
    walletInfo
  } = useEncryptedWallet();
  const router = useRouter();

  const [walletError] = useState<string | null>(null);
  const [showEncryptedWalletFlow, setShowEncryptedWalletFlow] = useState(false);
  const [encryptedWalletMode, setEncryptedWalletMode] = useState<'unlock' | 'create'>('unlock');

  useEffect(() => {
    if (address && onClose) {
      onClose();
    }
  }, [address, onClose]);

  useEffect(() => {
    if (isEncryptedAuthenticated && onClose) {
      onClose();
    }
  }, [isEncryptedAuthenticated, onClose]);


  const handleEncryptedWalletSubmit = async (password: string, email?: string) => {
    try {
      if (encryptedWalletMode === 'create') {
        // Generate new wallet data for encryption
        const { mnemonic, stxPrivateKey, address } = await createStacksAccount();
        const walletData = {
          mnemonic,
          privateKey: stxPrivateKey,
          address,
          label: '4V4 Wallet'
        };
        await createEncryptedWallet(walletData, password);
        
        // Save to Supabase if email provided using the same pattern as Bbox.
        if (email) {
          try {
            console.log('Attempting to save account to database...');
            const response = await fetch('/api/save-account', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email,
                password,
                walletData: {
                  stxPrivateKey,
                  address,
                  mnemonic,
                },
              }),
            });
            
            const result = await response.json();
            
            if (!response.ok) {
              console.warn('Failed to save account to database:', result);
              console.warn('Account creation will continue without database save');
            } else {
              console.log('Account saved to database successfully:', result);
            }
          } catch (dbError) {
            console.warn('Database save error:', dbError);
            console.warn('Account creation will continue without database save');
          }

          // Send confirmation email with address
          try {
            const mailRes = await fetch('/api/wallet-connect/account-created', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, address }),
            });
            const mailResult = await mailRes.json();
            if (!mailRes.ok) {
              console.warn('Failed to send confirmation email:', mailResult);
            } else {
              console.log('Confirmation email sent:', mailResult);
            }
          } catch (mailError) {
            console.warn('Error sending confirmation email:', mailError);
          }
        }
        
        // Redirect to welcome page with email
        const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
        router.push(`/welcome${emailParam}`);
        if (onClose) onClose();
      } else {
        await unlockWallet(password);
        if (walletInfo) {
          // For existing wallets, redirect to the address page
          router.push(`/${walletInfo.address}`);
          if (onClose) onClose();
        }
      }
    } catch (error) {
      // Error will be handled by the PassphraseInput component
      console.error('Encrypted wallet operation failed:', error);
    }
  };

  const handleShowEncryptedWallet = () => {
    setEncryptedWalletMode(isWalletEncrypted ? 'unlock' : 'create');
    setShowEncryptedWalletFlow(true);
  };

  const handleLegalLinkClick = () => {
    onClose?.();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#1b1412] text-[#f1dfbd] rounded-[3px] w-[360px] pt-8 pb-0 px-0 shadow-2xl flex flex-col items-center
          transition-all duration-300 ease-out
          opacity-0 translate-y-[-24px] animate-getinmodal border border-[#c18b4e]/45"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="w-full grid grid-cols-3 gap-0 relative mb-6 px-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="justify-start bg-none border-none text-muted-foreground text-sm cursor-pointer" aria-label="Ayuda" type="button">
                  <CircleHelp className="h-[18px]"/>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm z-100">
                <div>
                  Conecta o crea tu cuenta usando una billetera o frase semilla.<br />
                  <span className="text-primary underline">
                    <a href="/support" target="_blank" rel="noopener noreferrer">¿Necesitas ayuda? Visita Soporte</a>
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="title text-center font-semibold text-lg text-foreground tracking-wider flex items-center justify-center select-none">
          </div>
          <div className="flex items-center justify-end">
            <button onClick={onClose} className="bg-none border-none text-muted-foreground text-xl cursor-pointer" aria-label="Cerrar" type="button">
              <X className="h-[18px]"/>
            </button>
          </div>
        </div>
        {/* Auth Options - Conditional rendering based on flow */}
        <div className="w-full flex flex-col gap-3 px-6 mb-3">
          {/* Auth options: Connect Wallet, Encrypted Wallet, Email, Mnemonic */}
          {showEncryptedWalletFlow ? (
            /* Encrypted Wallet Flow */
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {encryptedWalletMode === 'create' ? 'Protege tu billetera' :
                   isSessionLocked ? 'Desbloquea tu billetera' : 'Accede a tu billetera'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {encryptedWalletMode === 'create' 
                    ? 'Crea una contraseña para cifrar tu billetera localmente'
                    : 'Ingresa tu contraseña para desbloquear tu billetera cifrada'
                  }
                </p>
              </div>
              
              <PasswordInput
                mode={encryptedWalletMode}
                onSubmit={handleEncryptedWalletSubmit}
                isLoading={encryptedLoading}
                error={encryptedAuthError}
                showStrengthIndicator={encryptedWalletMode === 'create'}
                onCancel={() => setShowEncryptedWalletFlow(false)}
              />

              {encryptedWalletMode === 'unlock' && (
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('cholo_session');
                        localStorage.removeItem('cholo_session_config');
                        localStorage.removeItem('cholo_session_locked');
                        localStorage.removeItem('cholo_encrypted_session');
                        localStorage.removeItem('4v4_encrypted_wallet');
                        localStorage.removeItem('blockstack-session');
                        localStorage.removeItem('connect-session');
                        sessionStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="w-full h-10 rounded-[7px] bg-card text-muted-foreground text-sm border border-border cursor-pointer flex items-center px-4 hover:bg-muted hover:text-destructive mt-2"
                    type="button"
                  >
                    Cerrar todas las sesiones
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Main Auth Options */
            <>
              {/* Wallet providers are shown directly instead of behind another modal. */}
              <div>
                <ConnectModal
                  embedded
                  onClose={() => onClose?.()}
                  onSuccess={() => onClose?.()}
                />
                {walletError && (
                  <div className="text-destructive text-xs mt-2 text-center">{walletError}</div>
                )}
              </div>
              {/* Encrypted Wallet Option */}
              <div>
                <Button
                  onClick={handleShowEncryptedWallet}
                  className="w-full h-12 rounded-[1px] bg-red-500 text-foreground font-semibold text-base cursor-pointer flex items-center px-4 hover:bg-red-600"
                  type="button"
                >
                  <Shield className="w-[18px] h-[18px] mx-[5px]"/>
                  <span className="text-center flex-1">
                    {isWalletEncrypted && walletInfo 
                      ? `Desbloquear ${formatStxAddress(walletInfo.address)}`
                      : 'Crear Cuenta'}
                  </span>
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Terms */}
        <div className="w-full rounded-b-2xl text-center text-xs text-muted-foreground tracking-wider p-6 px-8">
          Al iniciar sesión, aceptas nuestros <Link href="/terms" onClick={handleLegalLinkClick} className="hover:text-foreground">Términos de servicio</Link> y la <Link href="/privacy" onClick={handleLegalLinkClick} className="hover:text-foreground">Política de privacidad</Link>
        </div>
      </div>
    </div>
  );
}
