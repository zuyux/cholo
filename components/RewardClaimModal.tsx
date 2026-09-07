'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { Check, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { hashMessage } from '@stacks/encryption';
import { privateKeyToPublic, publicKeyToHex, signMessageHashRsv } from '@stacks/transactions';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { consumeQueuedWelcomeModalAddress, useWallet, WELCOME_MODAL_AFTER_SIGN_IN_EVENT } from './WalletProvider';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { OPEN_REWARD_CLAIM_EVENT, type RewardClaimStatus } from '@/lib/rewardEvents';
import { authenticateRewardWallet } from '@/lib/rewardAuthClient';
import { getRewardCallbackMessage } from '@/lib/rewardErrors';
import { requestLeatherStacksSignIn, requestXverseStacksSignIn } from '@/lib/stacksSignInMessage';

import { REWARD_TERMS_VERSION } from '@/lib/rewardEligibility';
const EMPTY_STATUS: RewardClaimStatus = { x: { connected: false, following: false }, eligible: false, claimed: false, termsAccepted: false };
const SOCIALS = {
  x: { label: 'X', account: '@cholocoinmeme', followUrl: 'https://x.com/cholocoinmeme' },
  instagram: { label: 'Instagram', account: '@cholocoin', followUrl: 'https://instagram.com/cholocoin' },
} as const;

export default function RewardClaimModal() {
  const address = useCurrentAddress();
  const { walletType } = useWallet();
  const { currentWallet, isAuthenticated: isEncryptedAuthenticated } = useEncryptedWallet();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RewardClaimStatus>(EMPTY_STATUS);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [acceptingTerms, setAcceptingTerms] = useState(false);

  const signWithLocalWallet = useCallback(async (message: string) => {
    if (!currentWallet?.privateKey || !isEncryptedAuthenticated) {
      throw new Error('Desbloquea tu billetera CHOLO antes de continuar.');
    }
    if (currentWallet.address.toLowerCase() !== address?.toLowerCase()) {
      throw new Error('La billetera desbloqueada no coincide con esta sesión.');
    }

    const messageHash = Array.from(hashMessage(message), (byte) => byte.toString(16).padStart(2, '0')).join('');
    return {
      signature: signMessageHashRsv({ messageHash, privateKey: currentWallet.privateKey }),
      publicKey: publicKeyToHex(privateKeyToPublic(currentWallet.privateKey)),
    };
  }, [address, currentWallet, isEncryptedAuthenticated]);

  const ensureRewardSession = useCallback(async (walletAddress: string) => {
    const leatherProvider = window.LeatherProvider;
    if (walletType === 'leather' && leatherProvider && typeof leatherProvider === 'object' && 'request' in leatherProvider && typeof leatherProvider.request === 'function') {
      const provider = leatherProvider as { request: (method: string, params?: unknown) => Promise<unknown> };
      await authenticateRewardWallet(walletAddress, (message) => requestLeatherStacksSignIn(provider, walletAddress, message));
      return;
    }
    if (walletType === 'xverse') {
      await authenticateRewardWallet(walletAddress, (message) => requestXverseStacksSignIn(walletAddress, message));
      return;
    }
    if (currentWallet?.address.toLowerCase() === walletAddress.toLowerCase()) {
      await authenticateRewardWallet(walletAddress, signWithLocalWallet);
    }
  }, [currentWallet, signWithLocalWallet, walletType]);

  const loadStatus = useCallback(async (walletAddress: string, verify = false) => {
    setChecking(true); setMessage(null);
    setStatus(EMPTY_STATUS);
    try {
      if (verify) {
        await ensureRewardSession(walletAddress);
      }
      const response = await fetch(`/api/rewards/social-status${verify ? '?verify=true' : ''}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo comprobar tus cuentas');
      if (payload.address?.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error('Comprueba nuevamente la propiedad de tu billetera para ver tus cuentas.');
      }
      setStatus(payload);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo comprobar tus cuentas'); }
    finally { setChecking(false); }
  }, [ensureRewardSession]);

  useEffect(() => {
    const show = (event?: Event) => {
      const eventAddress = (event as CustomEvent<{ address?: string }>)?.detail?.address;
      const walletAddress = eventAddress || address;
      if (!walletAddress) return;
      if (event?.type === WELCOME_MODAL_AFTER_SIGN_IN_EVENT) consumeQueuedWelcomeModalAddress();
      setOpen(true); void loadStatus(walletAddress);
    };
    window.addEventListener(WELCOME_MODAL_AFTER_SIGN_IN_EVENT, show);
    window.addEventListener(OPEN_REWARD_CLAIM_EVENT, show);
    const queuedAddress = consumeQueuedWelcomeModalAddress();
    if (queuedAddress) show(new CustomEvent('queued', { detail: { address: queuedAddress } }));
    const callbackUrl = new URL(window.location.href);
    const rewardError = callbackUrl.searchParams.get('rewardError');
    if (rewardError !== null || ((callbackUrl.searchParams.get('rewardXConnected') === 'true' || callbackUrl.searchParams.get('rewardInstagramConnected') === 'true') && address)) {
      setOpen(true);
      setCallbackError(rewardError !== null ? getRewardCallbackMessage(rewardError) : null);
      if (address) void loadStatus(address);
      callbackUrl.searchParams.delete('rewardError');
      callbackUrl.searchParams.delete('rewardXConnected');
      callbackUrl.searchParams.delete('rewardInstagramConnected');
      window.history.replaceState({}, '', `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`);
    }
    return () => { window.removeEventListener(WELCOME_MODAL_AFTER_SIGN_IN_EVENT, show); window.removeEventListener(OPEN_REWARD_CLAIM_EVENT, show); };
  }, [address, loadStatus]);

  useEffect(() => {
    if (!open) return;
    const refresh = () => { if (address) void loadStatus(address); };
    window.addEventListener('focus', refresh);
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('focus', refresh);
    };
  }, [open, address, loadStatus]);

  const acceptTerms = async () => {
    if (status.termsAccepted || !address) return;
    setAcceptingTerms(true); setMessage(null);
    try {
      await ensureRewardSession(address);
      const response = await fetch('/api/rewards/terms/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accepted: true, version: REWARD_TERMS_VERSION }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo registrar la aceptación');
      setStatus(payload);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo registrar la aceptación'); }
    finally { setAcceptingTerms(false); }
  };

  const connectSocial = async (provider: 'x' | 'instagram') => {
    if (!address) return;
    setCallbackError(null);
    setMessage(null);
    if (!status.termsAccepted) {
      setMessage('Acepta los términos y condiciones antes de autenticar tus cuentas.');
      return;
    }
    setChecking(true);
    try {
      await ensureRewardSession(address);
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.assign(`/api/rewards/connect/${provider}?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar la autenticación.');
      setChecking(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="reward-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="reward-modal" role="dialog" aria-modal="true" aria-labelledby="reward-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="reward-modal-close" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={20} /></button>
        <p className="cholo-kicker">Posibles recompensas</p>
        <h2 id="reward-title">Conecta con <span>la manada</span></h2>
        <p className="reward-modal-lead">Autentica tus cuentas para participar en posibles recompensas. La selección y distribución se revisan manualmente; no están garantizadas.</p>
        <label className="reward-terms-consent">
          <input type="checkbox" checked={status.termsAccepted} disabled={status.termsAccepted || acceptingTerms} onChange={(event) => event.target.checked && void acceptTerms()} />
          <span className="reward-terms-check" aria-hidden="true">
            {acceptingTerms ? <LoaderCircle className="animate-spin" size={12} /> : status.termsAccepted ? <Check size={12} /> : null}
          </span>
          <span>Acepto los <Link href="/reward-terms" target="_blank" rel="noopener noreferrer">Términos y condiciones de recompensa</Link>.</span>
        </label>
        <div className="reward-modal-steps">
          {(['x', 'instagram'] as const).map((provider, index) => {
            const social = SOCIALS[provider];
            const connected = status[provider]?.connected;
            const username = status[provider]?.username;
            return (
              <article key={provider} className={connected ? 'is-complete' : ''}>
                <span className="reward-step-number">0{index + 1}</span>
                <div className="reward-step-icon">
                  {provider === 'x' ? <b>𝕏</b> : <Image src="/instagram.svg" alt="" width={22} height={22} unoptimized />}
                </div>
                <div className="reward-step-copy">
                  <strong>{social.label}</strong>
                  <span>{connected ? (username ? `@${username.replace(/^@+/, '')}` : 'Cuenta conectada') : 'Sin autenticar'}</span>
                  {connected && <small className="reward-verified"><Check size={12} /> Autenticado</small>}
                </div>
                <div className="reward-social-actions">
                  {!connected && <button onClick={() => void connectSocial(provider)} disabled={checking || !address || !status.termsAccepted}>Autenticar {social.label}</button>}
                  <a href={social.followUrl} target="_blank" rel="noopener noreferrer" aria-label={`Seguir a ${social.account} en ${social.label}`}>Seguir {social.account}</a>
                </div>
              </article>
            );
          })}
        </div>
        <p className="reward-modal-fineprint">Instagram permite autenticar cuentas de creador o empresa. Los enlaces para seguir son opcionales y no se verifican.</p>
        <button className="reward-check-button" onClick={() => address && loadStatus(address, true)} disabled={checking || !address}>{checking ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}{checking ? 'Actualizando...' : 'Actualizar cuentas'}</button>
        <p className="reward-modal-message" role="status">{status.eligible ? 'Perfil elegible para evaluación de posibles recompensas. No hay una recompensa aprobada ni un envío automático.' : 'Acepta los términos y autentica una cuenta para participar.'}</p>
        {callbackError ? <p className="reward-modal-message" role="alert">{callbackError}</p> : message && <p className="reward-modal-message" role="status">{message}</p>}
        <p className="reward-modal-fineprint">
          Autenticar tus cuentas no garantiza recibir tokens. Nunca te pediremos tu frase semilla.
        </p>
      </section>
    </div>, document.body,
  );
}
