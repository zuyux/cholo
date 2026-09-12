import { DAO_CONTRACT, daoFetch, formatDaoStx, formatDaoTokenAmount, proposalStatus, type DaoProposal, type DaoState } from './cholo-dao';

export const STATUS_FILTERS = { all: 'Todas', attention: 'Necesita atención', approval: 'Por aprobar por ti', ready: 'Listas para ejecutar', expiring: 'Próximas a expirar', pending: 'Pendientes', blocked: 'Bloqueadas', executed: 'Ejecutadas', expired: 'Expiradas' } as const;
export type StatusFilter = keyof typeof STATUS_FILTERS;
export function matchesProposal(p: DaoProposal, state: DaoState, address: string | null, filter: StatusFilter): boolean {
  const status = proposalStatus(p, state);
  const active = !p.executed && !status.expired;
  const approval = active && Boolean(address && state.signers.includes(address)) && !p.hasApproved && BigInt(p.approvals) < BigInt(state.required);
  const expiring = active && BigInt(p.expiration) - BigInt(state.height) <= BigInt(144);
  switch (filter) {
    case 'all': return true;
    case 'attention': return approval || (active && status.ready) || expiring;
    case 'approval': return approval;
    case 'ready': return active && status.ready;
    case 'expiring': return expiring;
    case 'executed': return p.executed;
    case 'expired': return !p.executed && status.expired;
    case 'blocked': return active && status.blockers.length > 0;
    case 'pending': return active && !status.ready && status.blockers.length === 0;
  }
}
export function proposalReview(p: DaoProposal, state: DaoState): string[] {
  const lines = [p.description];
  if (p['proposal-type'] === 'transfer') lines.push(`Enviar ${formatDaoStx(p.amount)} STX a ${p.recipient}`);
  if (p['proposal-type'] === 'token-transfer') {
    const token = p.token ? state.tokens[p.token] : undefined;
    lines.push(`Enviar ${token ? `${formatDaoTokenAmount(p.amount, token.decimals)} ${token.symbol}` : `${p.amount} unidades mínimas`} a ${p.recipient}`, `Contrato: ${p.token}`);
  }
  if (p['new-signer'] || p['old-signer']) lines.push(`Firmante: ${p['old-signer'] ?? '(nuevo)'} → ${p['new-signer'] ?? '(retirado)'}`);
  if (p['new-required'] !== null) lines.push(`Quorum: ${state.required} (${state.configuredRequired === '0' ? 'automático' : 'fijo'}) → ${p['new-required']} (fijo). No se puede volver a automático.`);
  if (p['new-delay'] !== null) lines.push(`Espera: ${state.delay} → ${p['new-delay']} tenures`);
  lines.push(`Aprobaciones actuales: ${p.approvals} / ${state.required}`, `Expira en la altura ${p.expiration}`);
  return lines;
}
export interface TreasuryEvent { event_index: number; tx_id: string; event_type: string; asset: AssetEvent }
interface AssetEvent { asset_event_type: string; sender: string; recipient: string; amount: string; asset_id?: string }
export interface TreasuryPage { events: TreasuryEvent[]; nextOffset: number | null }
export async function loadTreasuryActivity(offset = 0): Promise<TreasuryPage> {
  const data = await daoFetch<{ results: TreasuryEvent[]; total: number }>(`/extended/v1/address/${DAO_CONTRACT}/assets?limit=50&offset=${offset}&unanchored=false`);
  if (!Array.isArray(data.results) || !Number.isSafeInteger(data.total)) throw new Error('Historial de tesorería inválido.');
  return { events: data.results.filter((event) => {
    const asset = event.event_type === 'stx_asset' || event.event_type === 'fungible_token_asset' ? event.asset : undefined;
    return asset?.asset_event_type === 'transfer' && (asset.sender === DAO_CONTRACT || asset.recipient === DAO_CONTRACT) && /^\d+$/.test(asset.amount);
  }), nextOffset: offset + data.results.length < data.total ? offset + data.results.length : null };
}
