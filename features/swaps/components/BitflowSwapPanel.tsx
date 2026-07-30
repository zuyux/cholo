'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ExternalLink, LoaderCircle, RefreshCw, X } from 'lucide-react';
import type { WalletType } from '@/components/WalletProvider';
import type { Network } from '@/lib/network';
import { bitflowProvider } from '../providers/bitflow';
import type { SwapToken } from '../types';
import { useBitflowQuote } from '../hooks/useBitflowQuote';

const SLIPPAGE_OPTIONS = [0.001, 0.005, 0.01];

const formatAmount = (value: string, maximumFractionDigits = 8) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString(undefined, { maximumFractionDigits })
    : value;
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Bitflow is unavailable right now.';

export function BitflowSwapPanel({ address, walletType, network, onClose, onComplete }: {
  address: string;
  walletType: WalletType | null;
  network: Network;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [tokens, setTokens] = useState<SwapToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenIn, setTokenIn] = useState('token-stx');
  const [tokenOut, setTokenOut] = useState('token-sbtc');
  const [amount, setAmount] = useState('');
  const [debouncedAmount, setDebouncedAmount] = useState('');
  const [slippage, setSlippage] = useState(0.005);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedAmount(amount), 400);
    return () => window.clearTimeout(timeout);
  }, [amount]);

  useEffect(() => {
    let active = true;
    setTokensLoading(true);
    bitflowProvider.getTokens()
      .then((available) => {
        if (!active) return;
        setTokens(available);
        setTokenIn((current) => available.some((token) => token.id === current) ? current : available[0]?.id || '');
        setTokenOut((current) => available.some((token) => token.id === current)
          ? current
          : available.find((token) => token.symbol.toLowerCase().includes('sbtc'))?.id || available[1]?.id || '');
        setTokenError(null);
      })
      .catch((error) => active && setTokenError(errorMessage(error)))
      .finally(() => active && setTokensLoading(false));
    return () => { active = false; };
  }, []); // Token registry is loaded once when the panel opens.

  const quoteQuery = useBitflowQuote({
    tokenIn,
    tokenOut,
    amount: debouncedAmount,
    slippage,
    walletAddress: address,
  });
  const quote = quoteQuery.data;
  const selectedInput = useMemo(() => tokens.find((token) => token.id === tokenIn), [tokenIn, tokens]);
  const canExecute = walletType === 'leather' || walletType === 'xverse';

  const getStacksProvider = () => {
    if (typeof window === 'undefined') return undefined;
    if (walletType === 'leather') return window.LeatherProvider;
    return window.XverseProviders?.StacksProvider || window.StacksProvider;
  };

  const execute = async () => {
    if (!canExecute) {
      setSubmissionError('Bitflow swaps currently require a connected Leather or Xverse signer.');
      return;
    }
    setSubmitting(true);
    setSubmissionError(null);
    try {
      const freshResult = await quoteQuery.refetch();
      const freshQuote = freshResult.data;
      if (!freshQuote) throw freshResult.error || new Error('Could not refresh the quote.');
      const changed = quote && (
        freshQuote.expectedOutput !== quote.expectedOutput ||
        freshQuote.route.id !== quote.route.id
      );
      if (changed) {
        setSubmissionError('The price or route changed. Review the updated quote, then swap again.');
        return;
      }
      const submission = await bitflowProvider.executeSwap({
        quote: freshQuote,
        senderAddress: address,
        slippage,
        stacksProvider: getStacksProvider(),
      });
      setTxId(submission.txId);
      setSubmitted(true);
      onComplete();
    } catch (error) {
      setSubmissionError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const explorerUrl = txId
    ? `https://explorer.hiro.so/txid/${txId}${network === 'mainnet' ? '' : `?chain=${network}`}`
    : undefined;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#111]/95 px-4 py-6" onClick={onClose}>
      <div className="max-h-[calc(100vh-3rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-[#111] p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Intercambiar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Adquiere un activo de Stacks sin salir de tu billetera.</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Cerrar intercambio" className="text-muted-foreground hover:text-foreground disabled:opacity-40"><X /></button>
        </div>

        {tokensLoading ? (
          <div className="flex min-h-48 items-center justify-center"><LoaderCircle className="animate-spin" /></div>
        ) : tokenError ? (
          <div className="rounded-xl border border-red-500/30 p-4 text-sm text-red-300">{tokenError}</div>
        ) : submitted ? (
          <div className="space-y-4 rounded-xl border border-emerald-500/30 p-5">
            <div className="font-semibold text-emerald-300">Intercambio enviado</div>
            <p className="text-sm text-muted-foreground">La transacción está pendiente. Tus saldos se actualizarán cuando se confirme.</p>
            {explorerUrl && <a href={explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline">Ver transacción <ExternalLink size={14} /></a>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <label className="text-xs text-muted-foreground" htmlFor="bitflow-token-in">Pagas</label>
              <div className="mt-2 flex gap-3">
                <input id="bitflow-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="min-w-0 flex-1 bg-transparent text-2xl outline-none" />
                <select id="bitflow-token-in" value={tokenIn} onChange={(event) => setTokenIn(event.target.value)} className="max-w-36 rounded-lg border border-border bg-[#111] px-3 py-2">
                  {tokens.filter((token) => token.id !== tokenOut).map((token) => <option key={token.id} value={token.id}>{token.symbol}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-center"><ArrowDown size={18} className="text-muted-foreground" /></div>

            <div className="rounded-xl border border-border p-4">
              <label className="text-xs text-muted-foreground" htmlFor="bitflow-token-out">Recibes</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="min-w-0 flex-1 text-2xl">{quoteQuery.isFetching ? <LoaderCircle className="animate-spin" size={22} /> : quote ? `≈ ${formatAmount(quote.expectedOutput)}` : '—'}</div>
                <select id="bitflow-token-out" value={tokenOut} onChange={(event) => setTokenOut(event.target.value)} className="max-w-36 rounded-lg border border-border bg-[#111] px-3 py-2">
                  {tokens.filter((token) => token.id !== tokenIn).map((token) => <option key={token.id} value={token.id}>{token.symbol}</option>)}
                </select>
              </div>
            </div>

            {quote && (
              <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Resultado esperado</span><span>{formatAmount(quote.expectedOutput)} {quote.tokenOut.symbol}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Resultado mínimo</span><span>{formatAmount(quote.minimumOutput)} {quote.tokenOut.symbol}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Ruta</span><span className="text-right">{quote.route.tokenPath.join(' → ')}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Liquidez</span><span className="text-right">{quote.route.dexPath.join(' → ') || 'Agregador Bitflow'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Comisión de red</span><span>Estimada por la billetera</span></div>
              </div>
            )}

            <div>
              <div className="mb-2 text-sm">Tolerancia de deslizamiento</div>
              <div className="grid grid-cols-3 gap-2">
                {SLIPPAGE_OPTIONS.map((option) => (
                  <button key={option} type="button" onClick={() => setSlippage(option)} className={`rounded-lg border px-3 py-2 text-sm ${slippage === option ? 'border-foreground' : 'border-border text-muted-foreground'}`}>{option * 100}%</button>
                ))}
              </div>
            </div>

            {(quoteQuery.error || submissionError) && <div className="rounded-lg border border-red-500/30 p-3 text-sm text-red-300">{submissionError || errorMessage(quoteQuery.error)}</div>}
            {!canExecute && <p className="text-xs text-amber-300">Conecta Leather o Xverse para firmar este intercambio. Bitflow aún no admite firmas importadas o con llave de acceso para llamadas a contratos.</p>}

            <button type="button" onClick={execute} disabled={!quote || quoteQuery.isFetching || submitting || !selectedInput || Number(amount) <= 0} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">
              {submitting ? <><LoaderCircle size={17} className="animate-spin" /> Actualizando cotización…</> : 'Revisar intercambio en la billetera'}
            </button>
            <button type="button" onClick={() => quoteQuery.refetch()} disabled={!debouncedAmount || quoteQuery.isFetching} className="flex w-full items-center justify-center gap-2 text-xs text-muted-foreground disabled:opacity-40"><RefreshCw size={13} /> Actualizar cotización</button>
            <p className="text-center text-xs text-muted-foreground">Servicio ofrecido por Bitflow. Esta transacción es independiente de cualquier financiamiento posterior.</p>
          </div>
        )}
      </div>
    </div>
  );
}
