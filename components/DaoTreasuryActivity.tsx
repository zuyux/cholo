'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DAO_CONTRACT, formatDaoStx, formatDaoTokenAmount, type DaoToken } from '../lib/cholo-dao';
import { loadTreasuryActivity, type TreasuryPage } from '../lib/dao-interface';
import DaoIdentity from './DaoIdentity';
import styles from '../app/dao/page.module.css';

export default function DaoTreasuryActivity({ tokens }: { tokens: Record<string, DaoToken> }) {
  const [history, setHistory] = useState<TreasuryPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const read = useCallback(async (offset = 0) => {
    const request = ++generation.current;
    setLoading(true); setError('');
    try {
      const data = await loadTreasuryActivity(offset);
      if (request === generation.current) setHistory((previous) => ({ ...data, events: [...new Map([...(offset ? previous?.events ?? [] : []), ...data.events].map((entry) => [`${entry.tx_id}:${entry.event_index}`, entry])).values()] }));
    } catch (err) { if (request === generation.current) setError(err instanceof Error ? err.message : 'No se pudo consultar el historial.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { const requests = generation; void read(); return () => { requests.current++; }; }, [read]);
  return <section className={styles.panel} aria-labelledby="treasury-activity-title">
    <div className={styles.toolbar}><h2 id="treasury-activity-title">Actividad compartida de tesorería</h2><button className={styles.iconButton} disabled={loading} onClick={() => void read()}><Image src="/refresh.svg" width={20} height={20} alt="" aria-hidden="true" />Actualizar historial</button></div>
    <p>Entradas y salidas STX y tokens confirmadas en la cadena, desde cualquier cuenta. Más recientes primero.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {history?.events.map((event) => {
      const asset = event.asset;
      const incoming = asset.recipient === DAO_CONTRACT;
      const contract = asset.asset_id?.split('::')[0];
      const token = contract ? tokens[contract] : undefined;
      return <div key={`${event.tx_id}:${event.event_index}`} className={styles.transaction}>
        <strong>{incoming ? 'Entrada' : 'Salida'} · {event.event_type === 'stx_asset' ? `${formatDaoStx(asset.amount)} STX` : token ? `${formatDaoTokenAmount(asset.amount, token.decimals)} ${token.symbol}` : `${asset.amount} unidades mínimas`}</strong>
        {asset.asset_id && <p>{asset.asset_id}</p>}
        <p>{incoming ? 'Desde' : 'Hacia'} <DaoIdentity address={incoming ? asset.sender : asset.recipient} /></p>
        <a href={`https://explorer.hiro.so/txid/${event.tx_id}?chain=mainnet`} target="_blank" rel="noreferrer">Ver transacción ↗</a>
      </div>;
    })}
    {loading && <p role="status">Consultando movimientos…</p>}
    {history && !history.events.length && <p>No se encontraron transferencias en los eventos consultados.</p>}
    {history?.nextOffset != null && <button disabled={loading} onClick={() => void read(history.nextOffset!)}>Cargar movimientos anteriores</button>}
    {history && <p>{history.nextOffset === null ? 'Fin del historial disponible.' : 'Queda historial por consultar.'}</p>}
  </section>;
}
