'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import styles from '../app/dao/page.module.css';

export default function DaoIdentity({ address }: { address: string }) {
  const [status, setStatus] = useState('');
  return <span style={{ overflowWrap: 'anywhere' }}>
    {address}{' '}
    <button className={`${styles.iconButton} ${styles.copyButton}`} type="button" aria-label={`Copiar dirección ${address}`} onClick={async () => {
      try { await navigator.clipboard.writeText(address); setStatus('Dirección copiada.'); }
      catch { setStatus('No se pudo copiar. Selecciona la dirección para copiarla.'); }
    }}><Copy size={18} aria-hidden="true" /></button>{' '}
    <a className={styles.identityAction} href={`https://explorer.hiro.so/address/${encodeURIComponent(address)}?chain=mainnet`} target="_blank" rel="noreferrer">Explorador ↗</a>
    <span role="status">{status}</span>
  </span>;
}
