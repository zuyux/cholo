'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Copy } from 'lucide-react';
import DaoSignerWorkflow from '@/components/DaoSignerWorkflow';
import { useWallet } from '@/components/WalletProvider';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { noneCV, someCV, uintCV, type ClarityValue, type PostCondition } from '@stacks/transactions';
import {
  DAO_CONTRACT, DAO_EXPLORER, DAO_PAGE_SIZE, PROPOSAL_TYPES, buildProposalArgs,
  daoFetch, executionPostConditions, formatDaoStx, loadDaoState,
  getDaoToken, parseDaoTokenAmount, formatDaoTokenAmount, loadDaoApprovals,
  DAO_TX_STORAGE_KEY, restoreDaoTransactions, updateDaoTransaction,
  type DaoToken, type DaoTransaction, type DaoApprovalPage,
  parseDaoStx, proposalStatus, mainnetPrincipal,
  type DaoProposal, type DaoState, type ProposalInput, type ProposalType,
} from '@/lib/cholo-dao';
import { STATUS_FILTERS, matchesProposal, proposalReview, type StatusFilter } from '@/lib/dao-interface';
import DaoTreasuryActivity from '@/components/DaoTreasuryActivity';
import DaoIdentity from '@/components/DaoIdentity';
import styles from './page.module.css';

const initialInput: ProposalInput = {
  type: 'add-signer', recipient: '', amount: '', newSigner: '', oldSigner: '', token: '',
  description: '', ttl: '1440', setting: '',
};
const message = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la solicitud.';

export default function DaoPage() {
  const { address: connectedAddress } = useWallet();
  const address = connectedAddress && /^(SP|SM)/.test(connectedAddress) ? connectedAddress : null;
  const [state, setState] = useState<DaoState | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [transactions, setTransactions] = useState<DaoTransaction[]>([]);
  const [trackingReady, setTrackingReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const pendingTx = transactions.some((tx) => tx.status === 'pending');
  const [token, setToken] = useState<DaoToken | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState<Record<string, DaoApprovalPage>>({});
  const [approvalLoading, setApprovalLoading] = useState<Record<string, boolean>>({});
  const [approvalErrors, setApprovalErrors] = useState<Record<string, string>>({});
  const [deposit, setDeposit] = useState('');
  const [input, setInput] = useState(initialInput);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [review, setReview] = useState<{ title: string; lines: string[] } | null>(null);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const reviewResolve = useRef<((accepted: boolean) => void) | null>(null);
  const finishReview = (accepted: boolean) => { reviewResolve.current?.(accepted); reviewResolve.current = null; setReview(null); };
  useEffect(() => {
    if (review) reviewDialog.current?.showModal();
    else reviewDialog.current?.close();
  }, [review]);
  useEffect(() => () => { reviewResolve.current?.(false); }, []);
  useEffect(() => {
    const readLink = () => {
      const id = new URLSearchParams(window.location.search).get('proposal');
      setSharedId(id && /^\d+$/.test(id) ? BigInt(id).toString() : null);
      setPage(0);
    };
    readLink(); window.addEventListener('popstate', readLink);
    return () => window.removeEventListener('popstate', readLink);
  }, []);
  const shareProposal = async (id: string) => {
    const url = new URL('/dao', window.location.origin); url.searchParams.set('proposal', id);
    try { await navigator.clipboard.writeText(url.toString()); setCopyStatus(`Enlace de la propuesta #${id} copiado.`); }
    catch { setCopyStatus(`Copia este enlace: ${url}`); }
  };
  const generation = useRef(0);
  const transactionLock = useRef(false);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    try {
      const data = await loadDaoState(address, 0, true);
      if (current === generation.current) { setState(data); setReadError(''); }
    } catch (err) {
      if (current === generation.current) setReadError(message(err));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    const requests = generation;
    void refresh();
    return () => { requests.current++; };
  }, [refresh]);

  useEffect(() => {
    try { setTransactions(restoreDaoTransactions(localStorage.getItem(DAO_TX_STORAGE_KEY))); }
    catch { setStorageError('El navegador no permite guardar el seguimiento. Conserva el enlace de la transacción antes de salir.'); }
    setTrackingReady(true);
  }, []);

  useEffect(() => {
    if (!trackingReady) return;
    try { localStorage.setItem(DAO_TX_STORAGE_KEY, JSON.stringify(transactions)); }
    catch { setStorageError('No se pudo guardar el seguimiento. Conserva el enlace de la transacción antes de salir.'); }
  }, [transactions, trackingReady]);

  const pendingIds = transactions.filter((tx) => tx.status === 'pending').map((tx) => tx.txid).join(',');
  useEffect(() => {
    if (!pendingIds) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      let confirmed = false;
      for (const txid of pendingIds.split(',')) {
        try {
          const result = await daoFetch<Parameters<typeof updateDaoTransaction>[1]>(`/extended/v1/tx/${txid}`);
          if (cancelled) return;
          setTransactions((previous) => previous.map((tx) => tx.txid === txid ? updateDaoTransaction(tx, result) : tx));
          confirmed ||= result.tx_status !== 'pending';
        } catch {
          if (cancelled) return;
          setTransactions((previous) => previous.map((tx) => tx.txid === txid ? { ...tx, detail: 'Aún no se puede confirmar el estado. Se reintentará; consulta el explorador.' } : tx));
        }
      }
      if (confirmed) { setApprovalHistory({}); void refresh(); }
      if (!cancelled) timer = setTimeout(check, 15000);
    };
    void check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pendingIds, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    setToken(null); setTokenError('');
    if (input.type !== 'token-transfer' || !input.token.trim()) { setTokenLoading(false); return; }
    setTokenLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await getDaoToken(input.token);
        if (!cancelled) setToken(data);
      } catch (err) { if (!cancelled) setTokenError(message(err)); }
      finally { if (!cancelled) setTokenLoading(false); }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [input.type, input.token]);

  const readApprovals = async (id: string, reset = false) => {
    setApprovalLoading((prev) => ({ ...prev, [id]: true }));
    setApprovalErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const previous = reset ? undefined : approvalHistory[id];
      const data = await loadDaoApprovals(id, previous?.nextOffset ?? 0);
      setApprovalHistory((prev) => ({ ...prev, [id]: {
        ...data, approvals: [...new Map([...(previous?.approvals ?? []), ...data.approvals].map((entry) => [entry.txid, entry])).values()],
      } }));
    } catch (err) { setApprovalErrors((prev) => ({ ...prev, [id]: message(err) })); }
    finally { setApprovalLoading((prev) => ({ ...prev, [id]: false })); }
  };

  const transact = async (build: (fresh: DaoState, sender: string) => Promise<{ name: string; args: ClarityValue[]; postConditions: PostCondition[]; review: string[] }>) => {
    if (!address || transactionLock.current || pendingTx) return;
    transactionLock.current = true;
    setBusy(true); setError('');
    try {
      const { request } = await import('@stacks/connect');
      const accounts = await request({ enableLocalStorage: false }, 'getAddresses', { network: 'mainnet' });
      if (!accounts.addresses.some((entry) => entry.address === address)) {
        throw new Error('La cuenta de la wallet cambió. Conecta de nuevo la cuenta mainnet.');
      }
      const fresh = await loadDaoState(address, 0, true);
      setState(fresh);
      const call = await build(fresh, address);
      setReview({ title: call.name === 'deposit' ? 'Revisar depósito' : call.name === 'create-proposal' ? 'Revisar nueva propuesta' : call.name === 'approve-proposal' ? 'Revisar aprobación' : 'Revisar ejecución', lines: [`Cuenta: ${address}`, 'Red: Stacks mainnet', ...call.review] });
      const accepted = await new Promise<boolean>((resolve) => { reviewResolve.current = resolve; });
      if (!accepted) return;
      const latest = await loadDaoState(address, 0, true);
      setState(latest);
      const checked = await build(latest, address);
      if (JSON.stringify(checked, (_key, value) => typeof value === 'bigint' ? value.toString() : value) !== JSON.stringify(call, (_key, value) => typeof value === 'bigint' ? value.toString() : value)) throw new Error('El estado cambió durante la revisión. Revisa de nuevo antes de firmar.');
      const currentAccounts = await request({ enableLocalStorage: false }, 'getAddresses', { network: 'mainnet' });
      if (!currentAccounts.addresses.some((entry) => entry.address === address)) throw new Error('La cuenta mainnet cambió. Conecta de nuevo antes de firmar.');
      const result = await request({ enableLocalStorage: false }, 'stx_callContract', {
        contract: DAO_CONTRACT, network: 'mainnet', address: address as `S${string}`,
        functionName: call.name, functionArgs: call.args,
        postConditionMode: 'deny', postConditions: call.postConditions,
      });
      if (!result.txid) throw new Error('La wallet no devolvió un ID de transacción. Verifica su actividad antes de reintentar.');
      const txid = result.txid.startsWith('0x') ? result.txid : `0x${result.txid}`;
      const transaction: DaoTransaction = {
        txid, action: call.name, status: 'pending', detail: 'Enviada. Esperando confirmación en mainnet.',
        proposalId: call.name === 'approve-proposal' || call.name === 'execute-proposal' ? String((call.args[0] as { value: bigint }).value) : undefined,
      };
      setTransactions((previous) => [transaction, ...previous].slice(0, 20));
    } catch (err) { setError(message(err)); }
    finally { transactionLock.current = false; setBusy(false); }
  };

  const createProposal = (event: FormEvent) => {
    event.preventDefault();
    void transact(async (fresh, sender) => {
      if (!fresh.signers.includes(sender)) throw new Error('Solo los firmantes actuales pueden crear propuestas.');
      let proposalInput = input;
      if (input.type === 'token-transfer') {
        const verified = await getDaoToken(input.token);
        if (!token || token.contract !== verified.contract || token.decimals !== verified.decimals || token.asset !== verified.asset || token.symbol !== verified.symbol) {
          setToken(verified);
          throw new Error('Los metadatos del token cambiaron. Revisa la cantidad y vuelve a enviar.');
        }
        proposalInput = { ...input, amount: parseDaoTokenAmount(input.amount, verified.decimals) };
      }
      return { name: 'create-proposal', args: buildProposalArgs(proposalInput, fresh), postConditions: [], review: [PROPOSAL_TYPES[input.type], input.description, ...(transfer ? [`Enviar ${input.amount} ${input.type === 'transfer' ? 'STX' : token?.symbol} a ${input.recipient}`, ...(input.token ? [`Contrato: ${input.token}`] : [])] : []), ...(input.newSigner || input.oldSigner ? [`Firmante: ${input.oldSigner || '(nuevo)'} → ${input.newSigner || '(retirado)'}`] : []), ...(input.type === 'set-required-sigs' ? [`Quorum: ${fresh.required} (${fresh.configuredRequired === '0' ? 'automático' : 'fijo'}) → ${input.setting} (fijo). No se puede volver a automático.`] : []), ...(input.type === 'set-exec-delay' ? [`Espera: ${fresh.delay} → ${input.setting} tenures`] : []), `Vigencia: ${input.ttl} tenures desde la creación`, 'Crear no cuenta como aprobación.'] };
    });
  };
  const actOnProposal = (proposal: DaoProposal, execute: boolean) => {
    void transact(async (fresh, sender) => {
      const p = fresh.proposals.find((entry) => entry.id === proposal.id);
      if (!p) throw new Error('La lista cambió. Actualiza y selecciona de nuevo la propuesta.');
      const status = proposalStatus(p, fresh);
      if (p.executed || status.expired) throw new Error('La propuesta ya fue ejecutada o expiró.');
      if (!execute) {
        if (!fresh.signers.includes(sender) || p.hasApproved) throw new Error('No puedes aprobar esta propuesta con esta cuenta.');
        return { name: 'approve-proposal', args: [uintCV(p.id)], postConditions: [], review: [`Propuesta #${p.id}`, ...proposalReview(p, fresh), 'Aprobar no ejecuta la propuesta.'] };
      }
      if (!status.ready) throw new Error(status.blockers.join(' ') || 'Faltan aprobaciones o aún no terminó el tiempo de espera.');
      const asset = p.token ? fresh.tokens[p.token]?.asset : undefined;
      return {
        name: 'execute-proposal',
        args: [uintCV(p.id), p['proposal-type'] === 'token-transfer' && p.token ? someCV(mainnetPrincipal(p.token, true)) : noneCV()],
        postConditions: executionPostConditions(p, asset), review: [`Propuesta #${p.id}`, ...proposalReview(p, fresh)],
      };
    });
  };
  const update = (key: keyof ProposalInput, value: string) => setInput((prev) => ({ ...prev, [key]: value }));
  const canSign = Boolean(address && state?.signers.includes(address));
  const disabled = !trackingReady || busy || Boolean(pendingTx) || loading || Boolean(readError) || !address;
  let tokenPreview = '';
  let amountError = '';
  if (input.type === 'token-transfer' && token?.contract === input.token.trim() && input.amount) {
    try { tokenPreview = parseDaoTokenAmount(input.amount, token.decimals); }
    catch (err) { amountError = message(err); }
  }
  const transfer = input.type === 'transfer' || input.type === 'token-transfer';

  const filtered = state?.proposals.filter((p) => (!sharedId || p.id === sharedId) && (typeFilter === 'all' || p['proposal-type'] === typeFilter) && matchesProposal(p, state, address, statusFilter)) ?? [];
  const visible = filtered.slice(page * DAO_PAGE_SIZE, (page + 1) * DAO_PAGE_SIZE);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <dialog ref={reviewDialog} className={styles.review} onCancel={(event) => { event.preventDefault(); finishReview(false); }} aria-labelledby="review-title">
          <h2 id="review-title">{review?.title}</h2>
          {review?.lines.map((line, index) => <p key={index}>{line}</p>)}
          <p>Revisa también los detalles y la comisión que muestra tu wallet.</p>
          <div className={styles.actions}><button autoFocus onClick={() => finishReview(false)}>Volver</button><button onClick={() => finishReview(true)}>Continuar a la wallet</button></div>
        </dialog>
        <p role="status">{copyStatus}</p>
        <Link href="/" className={styles.back}>← Volver a CHOLO</Link>
        <header className={styles.header}>
          <div><p className={styles.kicker}>TESORERÍA COMUNITARIA · STACKS MAINNET</p><h1>CHOLO DAO</h1><p>Consulta la tesorería y participa en las decisiones del DAO.</p></div>
        </header>
        <p className={styles.contract}><a href={DAO_EXPLORER} target="_blank" rel="noreferrer">{DAO_CONTRACT} ↗</a></p>
        <p>Esta tesorería opera en mainnet. Confirma la cuenta y la red antes de firmar en tu wallet.</p>
        {connectedAddress && !address && <p role="status">Tu cuenta conectada no es de Stacks mainnet. Cambia la cuenta desde el menú de conexión para participar.</p>}
        {!connectedAddress && <p>Conecta tu wallet desde el menú de navegación para participar.</p>}
        {address && <p className={styles.contract}>Cuenta DAO: <strong>{address}</strong> · {canSign ? 'Firmante' : 'Observador'}</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {readError && <p role="alert" className={styles.error}>{readError}</p>}
        {storageError && <p role="alert" className={styles.error}>{storageError}</p>}
        {transactions.length > 0 && <section className={styles.panel} aria-label="Actividad de transacciones">
          <h2>Transacciones de este navegador</h2>
          <p>Se conservan las últimas 20 transacciones. El seguimiento pendiente continúa al volver a esta página.</p>
          <div aria-live="polite">{transactions.map((tx) => <div key={tx.txid} className={styles.transaction}>
            <strong>{tx.action === 'deposit' ? 'Depósito' : tx.action === 'create-proposal' ? 'Crear propuesta' : tx.action === 'approve-proposal' ? 'Aprobar propuesta' : 'Ejecutar propuesta'}{tx.proposalId !== undefined ? ` #${tx.proposalId}` : ''}</strong>
            <p>{tx.detail}</p>
            <a href={`https://explorer.hiro.so/txid/${tx.txid}?chain=mainnet`} target="_blank" rel="noreferrer">Ver transacción ↗</a>
          </div>)}</div>
        </section>}
        <div className={styles.toolbar}><h2>Estado del DAO</h2><button className={styles.iconButton} onClick={() => void refresh()} disabled={loading}><Image src="/refresh.svg" width={20} height={20} alt="" aria-hidden="true" />{loading ? 'Cargando…' : 'Actualizar'}</button></div>
        {state && <>
          <dl className={styles.stats}>
            <div><dt>Tesorería</dt><dd>{formatDaoStx(state.balance)} STX</dd></div>
            <div><dt>Aprobaciones requeridas</dt><dd>{state.required} de {state.signerCount}<small className={styles.quorumMode}>{state.configuredRequired === '0' ? 'Automático: 51%, redondeado hacia arriba' : `Quorum fijo: ${state.configuredRequired}`}</small></dd></div>
            <div><dt>Espera desde creación</dt><dd>{state.delay} tenures</dd></div>
            <div><dt>Altura de tenure</dt><dd>{state.height}</dd></div>
          </dl>
          <section className={styles.panel}><h2>Tokens de la tesorería</h2>
            {Object.keys(state.tokens).length === 0 && Object.keys(state.tokenErrors).length === 0 && <p>No se encontraron tokens SIP-010.</p>}
            {Object.values(state.tokens).map((entry) => <div key={entry.contract} className={styles.transaction}>
              <strong>{formatDaoTokenAmount(entry.balance, entry.decimals)} {entry.symbol}</strong>
              <p className={styles.contract}>{entry.contract} · {entry.decimals} decimales · {entry.balance} unidades mínimas</p>
            </div>)}
            {Object.entries(state.tokenErrors).map(([contract, detail]) => <p key={contract} className={styles.contract}>{contract}: {detail}</p>)}
          </section>
          <section className={styles.panel}><h2>Firmantes</h2><ol start={0} className={styles.signers}>{state.signers.map((signer) => <li key={signer}><DaoIdentity address={signer} /></li>)}</ol></section>
        </>}
        <DaoTreasuryActivity tokens={state?.tokens ?? {}} />
        <div className={styles.forms}>
          <section className={styles.panel}>
            <h2>Depositar STX</h2><p>Cualquier cuenta mainnet puede aportar a la tesorería.</p>
            <form onSubmit={(event) => {
              event.preventDefault();
              void transact(async (_fresh, sender) => {
                const amount = parseDaoStx(deposit).toString();
                return { name: 'deposit', args: [uintCV(amount)], postConditions: [{ type: 'stx-postcondition', address: sender, condition: 'eq', amount }], review: [`Depositar ${formatDaoStx(amount)} STX`, `Destino: ${DAO_CONTRACT}`] };
              });
            }}>
              <label>Cantidad en STX<input value={deposit} onChange={(event) => setDeposit(event.target.value)} inputMode="decimal" placeholder="0.000001" required /></label>
              <button disabled={disabled} type="submit">Depositar con wallet</button>
            </form>
          </section>
          <section className={styles.panel}>
            <h2>Crear propuesta</h2><p>La creación no cuenta como aprobación. Cada firmante debe aprobar por separado.</p>
            {(input.type === 'add-signer' || input.type === 'replace-signer') && <p>Agregar un firmante cambia quién puede autorizar decisiones del DAO. Por eso, {state ? `${state.required} de los ${state.signerCount} firmantes actuales` : 'los firmantes actuales'} deben aprobarlo. Después de crear la propuesta, sigue el proceso que aparece en su tarjeta.</p>}
            {!canSign && <p>Conecta una cuenta firmante para enviar propuestas.</p>}
            <form onSubmit={createProposal}>
              <label>Acción<select value={input.type} onChange={(event) => setInput({ ...initialInput, type: event.target.value as ProposalType })}>{Object.entries(PROPOSAL_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {transfer && <><label>Destinatario mainnet<input value={input.recipient} onChange={(e) => update('recipient', e.target.value)} placeholder="SP…" required /></label><label>{input.type === 'transfer' ? 'Cantidad en STX' : `Cantidad en ${token?.contract === input.token.trim() ? token.symbol : 'tokens'}`}<input value={input.amount} onChange={(e) => update('amount', e.target.value)} inputMode="decimal" required /></label></>}
              {input.type === 'token-transfer' && <label>Contrato del token mainnet<input value={input.token} onChange={(e) => update('token', e.target.value)} placeholder="SP….token" required /></label>}
              {input.type === 'token-transfer' && <div aria-live="polite">
                {tokenLoading && <p>Verificando token y saldo…</p>}
                {tokenError && <p role="alert" className={styles.error}>{tokenError}</p>}
                {token?.contract === input.token.trim() && <p>Saldo DAO: {formatDaoTokenAmount(token.balance, token.decimals)} {token.symbol} · {token.decimals} decimales.</p>}
                {tokenPreview && <p>Se propondrán exactamente <strong>{tokenPreview} unidades mínimas</strong>.</p>}
                {amountError && <p role="alert" className={styles.error}>{amountError}</p>}
              </div>}
              {(input.type === 'remove-signer' || input.type === 'replace-signer') && <label>Firmante actual<select value={input.oldSigner} onChange={(e) => update('oldSigner', e.target.value)} required><option value="">Selecciona un firmante</option>{state?.signers.map((signer, index) => <option key={signer} value={signer}>{index} · {signer}</option>)}</select></label>}
              {(input.type === 'add-signer' || input.type === 'replace-signer') && <label>Nuevo firmante mainnet<input value={input.newSigner} onChange={(e) => update('newSigner', e.target.value)} placeholder="SP…" required /></label>}
              {(input.type === 'set-required-sigs' || input.type === 'set-exec-delay') && <label>{input.type === 'set-required-sigs' ? 'Número de aprobaciones' : 'Espera desde creación (tenures)'}<input value={input.setting} onChange={(e) => update('setting', e.target.value)} inputMode="numeric" required /></label>}
              {input.type === 'set-exec-delay' && <p>Rango permitido: 0–9999 tenures. Una espera de 10000 o más impediría ejecutar futuras propuestas.</p>}
              {input.type === 'set-required-sigs' && <p>Este cambio establece un quorum fijo. El contrato no permite volver al modo automático.</p>}
              <label>Descripción<textarea value={input.description} onChange={(e) => update('description', e.target.value)} required rows={3} /></label>
              <label>Vigencia desde ahora (10–10000 tenures)<input value={input.ttl} onChange={(e) => update('ttl', e.target.value)} inputMode="numeric" required /></label>
              <button type="submit" disabled={disabled || !canSign || (input.type === 'token-transfer' && (tokenLoading || !token || token.contract !== input.token.trim() || Boolean(tokenError) || Boolean(amountError)))}>Crear con wallet</button>
            </form>
          </section>
        </div>
        <section aria-labelledby="proposals-title">
          <div className={styles.toolbar}><h2 id="proposals-title">Propuestas</h2><span>Más recientes primero · {filtered.length} resultados</span></div>
          {sharedId && <p>Propuesta compartida #{sharedId} <button onClick={() => { setSharedId(null); window.history.replaceState(null, '', '/dao'); }}>Ver todas</button></p>}
          <div className={styles.actions}>
            <button onClick={() => { setStatusFilter('attention'); setSharedId(null); setTypeFilter('all'); setPage(0); }}>Necesita atención ({state?.proposals.filter((p) => matchesProposal(p, state, address, 'attention')).length ?? 0})</button>
            <label>Estado<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as StatusFilter); setPage(0); }}>{Object.entries(STATUS_FILTERS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Tipo<select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(0); }}><option value="all">Todos los tipos</option>{Object.entries(PROPOSAL_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <p>Necesita atención incluye propuestas por aprobar por ti, listas para ejecutar o que expiran en 144 tenures o menos. {!address && 'Conecta tu cuenta para ver cuáles requieren tu aprobación.'}</p>
          {state && filtered.length === 0 && <p>No hay propuestas que coincidan con esta vista.</p>}
          {state && visible.map((p) => {
            const status = proposalStatus(p, state);
            return <article key={p.id} id={`proposal-${p.id}`} className={styles.panel}>
              <button className={`${styles.iconButton} ${styles.copyButton}`} type="button" aria-label={`Copiar enlace de la propuesta #${p.id}`} title={`Copiar enlace #${p.id}`} onClick={() => void shareProposal(p.id)}><Copy size={18} aria-hidden="true" /></button>
              <div className={styles.toolbar}><h3>#{p.id} · {PROPOSAL_TYPES[p['proposal-type']] ?? p['proposal-type']}</h3><strong>{p.executed ? 'Ejecutada' : status.expired ? 'Expirada' : status.ready ? 'Lista para ejecutar' : status.blockers.length ? 'Bloqueada' : 'Pendiente'}</strong></div>
              <p>{p.description}</p>
              {(p['proposal-type'] === 'add-signer' || p['proposal-type'] === 'replace-signer') && <DaoSignerWorkflow
                proposal={p} state={state} address={address} disabled={disabled}
                onApprove={() => actOnProposal(p, false)} onExecute={() => actOnProposal(p, true)}
              />}
              {!p.executed && !status.expired && <div className={styles.notice}>
                {BigInt(p.approvals) < BigInt(state.required) && <p>Faltan {(BigInt(state.required) - BigInt(p.approvals)).toString()} aprobaciones.</p>}
                {status.remaining !== '0' && <p>Faltan {status.remaining} tenures de espera.</p>}
                <p>Expira en {(BigInt(p.expiration) - BigInt(state.height)).toString()} tenures. Estado actualizado cada minuto.</p>
                {status.blockers.map((reason) => <p key={reason}>{reason}</p>)}
              </div>}
              <dl className={styles.details}>
                <div><dt>Aprobaciones</dt><dd>{p.approvals} / {state.required}{p.hasApproved ? ' · Ya aprobaste' : ''}</dd></div>
                <div><dt>Creada / ejecutable desde / expira</dt><dd>{p.created} / {status.executableAt} / {p.expiration} (tenures)</dd></div>
                {(p['proposal-type'] === 'transfer' || p['proposal-type'] === 'token-transfer') && <><div><dt>Destinatario</dt><dd>{p.recipient}</dd></div><div><dt>Cantidad</dt><dd>{p['proposal-type'] === 'transfer' ? `${formatDaoStx(p.amount)} STX` : p.token && state.tokens[p.token] ? `${formatDaoTokenAmount(p.amount, state.tokens[p.token].decimals)} ${state.tokens[p.token].symbol} (${p.amount} unidades mínimas)` : `${p.amount} unidades mínimas`}</dd></div></>}
                {p.token && <div><dt>Token</dt><dd>{p.token}</dd></div>}
                {p['old-signer'] && <div><dt>Firmante anterior</dt><dd>{p['old-signer']}</dd></div>}
                {p['new-signer'] && <div><dt>Nuevo firmante</dt><dd>{p['new-signer']}</dd></div>}
                {p['new-required'] !== null && <div><dt>Nuevo quorum</dt><dd>{p['new-required']}</dd></div>}
                {p['new-delay'] !== null && <div><dt>Nueva espera</dt><dd>{p['new-delay']} tenures</dd></div>}
              </dl>
              <div className={styles.history}>
                <h4>Quién aprobó</h4>
                <p>Las aprobaciones de antiguos firmantes siguen contando en este contrato.</p>
                {approvalHistory[p.id]?.approvals.map((entry) => <p key={entry.txid} className={styles.contract}>
                  <DaoIdentity address={entry.address} /> · {state.signers.includes(entry.address) ? 'Firmante actual' : 'Antiguo firmante'} · <a href={`https://explorer.hiro.so/txid/${entry.txid}?chain=mainnet`} target="_blank" rel="noreferrer">Aprobación ↗</a>
                </p>)}
                {approvalErrors[p.id] && <p role="alert" className={styles.error}>{approvalErrors[p.id]}</p>}
                {approvalHistory[p.id] && <p>{approvalHistory[p.id].approvals.length} de {p.approvals} aprobaciones encontradas en los eventos consultados.{approvalHistory[p.id].nextOffset !== null ? ' Queda historial por consultar.' : ' Fin del historial disponible.'}</p>}
                <button className={styles.iconButton} disabled={approvalLoading[p.id]} onClick={() => void readApprovals(p.id, approvalHistory[p.id]?.nextOffset === null)}>
                  {approvalHistory[p.id]?.nextOffset === null && <Image src="/refresh.svg" width={20} height={20} alt="" aria-hidden="true" />}
                  {approvalLoading[p.id] ? 'Consultando…' : !approvalHistory[p.id] ? 'Ver aprobaciones' : approvalHistory[p.id].nextOffset !== null ? 'Consultar más historial' : 'Actualizar aprobaciones'}
                </button>
              </div>
              {p['proposal-type'] !== 'add-signer' && p['proposal-type'] !== 'replace-signer' && !p.executed && !status.expired && <div className={styles.actions}>
                <button disabled={disabled || !canSign || p.hasApproved} onClick={() => actOnProposal(p, false)}>Aprobar #{p.id}</button>
                <button disabled={disabled || !status.ready} onClick={() => actOnProposal(p, true)}>Ejecutar #{p.id}</button>
              </div>}
            </article>;
          })}
          <div className={styles.actions}><button disabled={loading || page === 0} onClick={() => setPage(page - 1)}>Más recientes</button><span>Página {page + 1}</span><button disabled={loading || !state || (page + 1) * DAO_PAGE_SIZE >= filtered.length} onClick={() => setPage(page + 1)}>Más antiguas</button></div>
          <p>Cualquier cuenta puede ejecutar una propuesta aprobada cuando termina la espera. Los cambios de quorum y espera afectan las propuestas pendientes.</p>
        </section>
      </div>
    </main>
  );
}
