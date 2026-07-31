'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Check, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { consumeQueuedWelcomeModalAddress, useWallet, WELCOME_MODAL_AFTER_SIGN_IN_EVENT } from './WalletProvider';
import { OPEN_REWARD_CLAIM_EVENT, type RewardClaimStatus } from '@/lib/rewardEvents';
import { authenticateRewardWallet } from '@/lib/rewardAuthClient';
import { requestLeatherStacksSignIn, requestXverseStacksSignIn } from '@/lib/stacksSignInMessage';

const REWARD_TERMS_VERSION = '2026-07-30';
const EMPTY_STATUS: RewardClaimStatus = { x: { connected: false, following: false }, eligible: false, claimed: false, termsAccepted: false };
const SOCIALS = {
  x: { label: 'X', account: '@cholocoinmeme', followUrl: 'https://x.com/cholocoinmeme' },
} as const;

export default function RewardClaimModal() {
  const address = useCurrentAddress();
  const { walletType } = useWallet();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RewardClaimStatus>(EMPTY_STATUS);
  const [checking, setChecking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [followingX, setFollowingX] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [acceptingTerms, setAcceptingTerms] = useState(false);

  const loadStatus = useCallback(async (walletAddress: string, verify = false) => {
    setChecking(true); setMessage(null);
    try {
      if (verify) {
        const leatherProvider = window.LeatherProvider;
        if (walletType === 'leather' && leatherProvider && typeof leatherProvider === 'object' && 'request' in leatherProvider && typeof leatherProvider.request === 'function') {
          const provider = leatherProvider as { request: (method: string, params?: unknown) => Promise<unknown> };
          await authenticateRewardWallet(walletAddress, (message) => requestLeatherStacksSignIn(provider, walletAddress, message));
        } else if (walletType === 'xverse') {
          await authenticateRewardWallet(walletAddress, (message) => requestXverseStacksSignIn(walletAddress, message));
        }
      }
      const response = await fetch(`/api/rewards/social-status${verify ? '?verify=true' : ''}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo comprobar tus cuentas');
      setStatus(payload);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo comprobar tus cuentas'); }
    finally { setChecking(false); }
  }, [walletType]);

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
    if (callbackUrl.searchParams.get('rewardXConnected') === 'true' && address) {
      setOpen(true);
      void loadStatus(address);
      callbackUrl.searchParams.delete('rewardXConnected');
      window.history.replaceState({}, '', `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`);
    }
    return () => { window.removeEventListener(WELCOME_MODAL_AFTER_SIGN_IN_EVENT, show); window.removeEventListener(OPEN_REWARD_CLAIM_EVENT, show); };
  }, [address, loadStatus]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const acceptTerms = async () => {
    if (status.termsAccepted) return;
    setAcceptingTerms(true); setMessage(null);
    try {
      const response = await fetch('/api/rewards/terms/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accepted: true, version: REWARD_TERMS_VERSION }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo registrar la aceptación');
      setStatus(payload);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo registrar la aceptación'); }
    finally { setAcceptingTerms(false); }
  };

  const connectX = () => {
    if (!address) return;
    if (!status.termsAccepted) { setMessage('Acepta los términos y condiciones antes de autenticar X.'); return; }
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/api/rewards/connect/x?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const followOnX = async () => {
    if (!address) return;
    setFollowingX(true); setMessage(null);
    try {
      const response = await fetch('/api/rewards/follow/x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo seguir la cuenta en X');
      if (payload.x) setStatus(payload);
      else await loadStatus(address, true);
      setMessage(payload.pendingFollow
        ? 'X recibió la solicitud. La cuenta es privada y el follow está pendiente de aprobación.'
        : 'Ahora sigues a @cholocoinmeme en X.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo seguir la cuenta en X');
    } finally {
      setFollowingX(false);
    }
  };

  const claim = async () => {
    if (!address) return;
    setClaiming(true); setMessage(null);
    try {
      const response = await fetch('/api/rewards/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo reclamar la recompensa');
      setStatus(payload); setMessage('¡Listo! Tu recompensa de 1,000 $CHOLOs fue registrada.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo reclamar la recompensa'); }
    finally { setClaiming(false); }
  };

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="reward-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="reward-modal" role="dialog" aria-modal="true" aria-labelledby="reward-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="reward-modal-close" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={20} /></button>
        <p className="cholo-kicker">Recompensa de bienvenida</p>
        <h2 id="reward-title">Reclama <span>1,000 $CHOLOs</span></h2>
        <p className="reward-modal-lead">Conecta X y sigue a la manada. Verificaremos el requisito antes de habilitar la recompensa.</p>
        <label className="reward-terms-consent">
          <input type="checkbox" checked={status.termsAccepted} disabled={status.termsAccepted || acceptingTerms} onChange={(event) => event.target.checked && void acceptTerms()} />
          <span>Acepto los <Link href="/reward-terms" target="_blank" rel="noopener noreferrer">Términos y condiciones de recompensa</Link>.</span>
        </label>
        <div className="reward-modal-steps">
          <article className={status.x.following ? 'is-complete' : ''}>
            <span className="reward-step-number">01</span>
            <div className="reward-step-icon"><b>𝕏</b></div>
            <div className="reward-step-copy"><strong>X</strong><span>{status.x.username ? `@${status.x.username.replace(/^@/, '')}` : SOCIALS.x.account}</span></div>
            {status.x.following ? <span className="reward-verified"><Check size={16} /> Siguiendo</span> : status.x.connected ? <button onClick={followOnX} disabled={followingX}>{followingX ? 'Siguiendo...' : 'Seguir desde CHOLO'}</button> : <button onClick={connectX}>Autenticar</button>}
          </article>
        </div>
        <button className="reward-check-button" onClick={() => address && loadStatus(address, true)} disabled={checking || !address}>{checking ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}{checking ? 'Comprobando...' : 'Comprobar automáticamente'}</button>
        <button className="reward-claim-button" onClick={claim} disabled={!status.eligible || !status.termsAccepted || status.claimed || claiming}>{status.claimed ? 'Recompensa reclamada' : claiming ? 'Registrando...' : 'Reclamar 1,000 $CHOLOs'}</button>
        {message && <p className="reward-modal-message" role="status">{message}</p>}
        <p className="reward-modal-fineprint">
          Una recompensa por persona y billetera. Nunca te pediremos tu frase semilla.
        </p>
      </section>
    </div>, document.body,
  );
}
