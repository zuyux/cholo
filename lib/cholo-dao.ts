import {
  ClarityType, type ClarityValue, type PostCondition, type ClarityAbi, cvToHex, hexToCV,
  noneCV, principalCV, someCV, stringAsciiCV, stringUtf8CV, uintCV,
} from '@stacks/transactions';

export const DAO_ADDRESS = 'SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD';
export const DAO_CONTRACT = `${DAO_ADDRESS}.cholo-dao` as const;
export const DAO_API = 'https://api.hiro.so';
export const DAO_EXPLORER = `https://explorer.hiro.so/txid/${DAO_CONTRACT}?chain=mainnet`;
export const DAO_PAGE_SIZE = 10;
export const DAO_MAX_DELAY = BigInt(9999);
export const PROPOSAL_TYPES = {
  'transfer': 'Enviar STX',
  'token-transfer': 'Enviar token SIP-010',
  'add-signer': 'Agregar firmante',
  'remove-signer': 'Retirar firmante',
  'replace-signer': 'Reemplazar firmante',
  'set-required-sigs': 'Cambiar aprobaciones requeridas',
  'set-exec-delay': 'Cambiar tiempo de espera',
} as const;
export type ProposalType = keyof typeof PROPOSAL_TYPES;
export interface DaoProposal {
  id: string; recipient: string; amount: string; approvals: string; executed: boolean;
  'proposal-type': ProposalType; 'new-signer': string | null; 'old-signer': string | null;
  token: string | null; description: string; expiration: string; created: string;
  'new-required': string | null; 'new-delay': string | null; hasApproved: boolean;
  signerApprovals?: Record<string, boolean>;
}
export interface DaoState {
  height: string; balance: string; signerCount: string; required: string; delay: string;
  nextId: string; signers: string[]; proposals: DaoProposal[];
  configuredRequired: string; tokens: Record<string, DaoToken>; tokenErrors: Record<string, string>;
}
export interface DaoToken { contract: string; asset: string; symbol: string; decimals: number; balance: string }
export interface ProposalInput {
  type: ProposalType; recipient: string; amount: string; newSigner: string; oldSigner: string;
  token: string; description: string; ttl: string; setting: string;
}
const UINT_MAX = (BigInt(1) << BigInt(128)) - BigInt(1);
export function parseDaoUint(value: string, allowZero = false): bigint {
  if (!/^\d+$/.test(value)) throw new Error('Ingresa un número entero sin signo.');
  const n = BigInt(value);
  if (n > UINT_MAX || (!allowZero && n === BigInt(0))) throw new Error('Cantidad fuera de rango.');
  return n;
}
export function parseDaoStx(value: string): bigint {
  if (!/^\d+(\.\d{1,6})?$/.test(value)) throw new Error('Ingresa STX con hasta 6 decimales.');
  const [whole, fraction = ''] = value.split('.');
  return parseDaoUint((BigInt(whole) * BigInt(1000000) + BigInt(fraction.padEnd(6, '0'))).toString());
}
export function formatDaoStx(value: string): string {
  const n = BigInt(value);
  return `${n / BigInt(1000000)}.${(n % BigInt(1000000)).toString().padStart(6, '0')}`;
}
export function mainnetPrincipal(value: string, contract = false): ClarityValue {
  const p = principalCV(value.trim());
  if (!/^(SP|SM)/.test(value.trim()) || (contract && p.type !== ClarityType.PrincipalContract)) {
    throw new Error(contract ? 'Ingresa un contrato mainnet: SP….nombre.' : 'Usa una dirección Stacks mainnet (SP o SM).');
  }
  return p;
}
export function buildProposalArgs(input: ProposalInput, state: DaoState): ClarityValue[] {
  if (!Object.hasOwn(PROPOSAL_TYPES, input.type)) throw new Error('Tipo de propuesta inválido.');
  const ttl = parseDaoUint(input.ttl);
  if (ttl < BigInt(10) || ttl > BigInt(10000)) throw new Error('La vigencia debe ser de 10 a 10000 bloques de tenure.');
  const delay = input.type === 'add-signer' && state.signerCount === '1' ? BigInt(0) : BigInt(state.delay);
  if (ttl <= delay) throw new Error('La vigencia debe superar el tiempo de espera actual.');
  if (!input.description.trim() || [...input.description].length > 256) throw new Error('Escribe una descripción de 1 a 256 caracteres.');
  const adding = input.type === 'add-signer' || input.type === 'replace-signer';
  const removing = input.type === 'remove-signer' || input.type === 'replace-signer';
  if (adding && state.signers.includes(input.newSigner.trim())) throw new Error('La dirección ya es firmante.');
  if (removing && !state.signers.includes(input.oldSigner.trim())) throw new Error('El firmante anterior no pertenece al DAO.');
  if (input.type === 'remove-signer' && (BigInt(state.signerCount) <= BigInt(1) || BigInt(state.configuredRequired) >= BigInt(state.signerCount))) {
    throw new Error('Reduce primero el quorum para no dejar al DAO sin suficientes firmantes.');
  }
  const isTransfer = input.type === 'transfer' || input.type === 'token-transfer';
  const amount = input.type === 'transfer' ? parseDaoStx(input.amount) : input.type === 'token-transfer' ? parseDaoUint(input.amount) : BigInt(0);
  const setting = input.type === 'set-required-sigs' || input.type === 'set-exec-delay' ? parseDaoUint(input.setting, input.type === 'set-exec-delay') : BigInt(0);
  if (input.type === 'set-required-sigs' && setting > BigInt(state.signerCount)) throw new Error('El quorum no puede superar el número de firmantes.');
  if (input.type === 'set-exec-delay' && setting > DAO_MAX_DELAY) throw new Error('La espera debe ser de 0 a 9999 tenures para permitir futuras propuestas.');
  return [
    mainnetPrincipal(isTransfer ? input.recipient : DAO_ADDRESS), uintCV(amount), stringAsciiCV(input.type),
    adding ? someCV(mainnetPrincipal(input.newSigner)) : noneCV(),
    removing ? someCV(mainnetPrincipal(input.oldSigner)) : noneCV(),
    input.type === 'token-transfer' ? someCV(mainnetPrincipal(input.token, true)) : noneCV(),
    stringUtf8CV(input.description.trim()), uintCV(BigInt(state.height) + ttl),
    input.type === 'set-required-sigs' ? someCV(uintCV(setting)) : noneCV(),
    input.type === 'set-exec-delay' ? someCV(uintCV(setting)) : noneCV(),
  ];
}
export function proposalStatus(p: DaoProposal, state: DaoState) {
  const delay = p['proposal-type'] === 'add-signer' && state.signerCount === '1' ? BigInt(0) : BigInt(state.delay);
  const executableAt = BigInt(p.created) + delay;
  const expired = BigInt(p.expiration) <= BigInt(state.height);
  const ready = !p.executed && !expired && BigInt(p.approvals) >= BigInt(state.required) && BigInt(state.height) >= executableAt;
  const blockers = executionBlockers(p, state);
  const remaining = executableAt > BigInt(state.height) ? executableAt - BigInt(state.height) : BigInt(0);
  return { expired, ready: ready && blockers.length === 0, blockers, remaining: remaining.toString(), executableAt: executableAt.toString() };
}
export function executionPostConditions(p: DaoProposal, tokenAsset?: string): PostCondition[] {
  if (p['proposal-type'] === 'transfer') return [{ type: 'stx-postcondition', address: DAO_CONTRACT, condition: 'eq', amount: p.amount }];
  if (p['proposal-type'] === 'token-transfer') {
    if (!p.token || !tokenAsset || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tokenAsset)) throw new Error('No se pudo identificar el activo del token.');
    return [{ type: 'ft-postcondition', address: DAO_CONTRACT, condition: 'eq', amount: p.amount, asset: `${p.token}::${tokenAsset}` as `${string}.${string}::${string}` }];
  }
  return [];
}

// Decode explicitly: cvToValue keeps nested optional/tuple wrappers.
export function decodeDaoValue(cv: ClarityValue): unknown {
  switch (cv.type) {
    case ClarityType.UInt: return cv.value.toString();
    case ClarityType.BoolTrue: return true;
    case ClarityType.BoolFalse: return false;
    case ClarityType.OptionalNone: return null;
    case ClarityType.OptionalSome: case ClarityType.ResponseOk: return decodeDaoValue(cv.value);
    case ClarityType.ResponseErr: throw new Error(`El contrato devolvió un error: ${String(decodeDaoValue(cv.value))}`);
    case ClarityType.PrincipalStandard: case ClarityType.PrincipalContract:
    case ClarityType.StringASCII: case ClarityType.StringUTF8: return cv.value;
    case ClarityType.Tuple: return Object.fromEntries(Object.entries(cv.value).map(([key, value]) => [key, decodeDaoValue(value)]));
    default: throw new Error('Respuesta inesperada del contrato.');
  }
}
export async function daoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DAO_API}${path}`, { ...init, cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`No se pudo consultar mainnet (${response.status}). Intenta actualizar.`);
  return response.json();
}
async function readDao(name: string, args: ClarityValue[] = []) {
  const result = await daoFetch<{ okay: boolean; result?: string }>(`/v2/contracts/call-read/${DAO_ADDRESS}/cholo-dao/${name}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: DAO_ADDRESS, arguments: args.map(cvToHex) }),
  });
  if (!result.okay || !result.result) throw new Error(`No se pudo leer ${name}.`);
  return decodeDaoValue(hexToCV(result.result));
}
async function readVariable(name: string): Promise<string> {
  const value = await daoFetch<{ data: string }>(`/v2/data_var/${DAO_ADDRESS}/cholo-dao/${name}?proof=0`);
  const decoded = decodeDaoValue(hexToCV(value.data));
  if (typeof decoded !== 'string' || !/^\d+$/.test(decoded)) throw new Error('Estado del DAO inválido.');
  return decoded;
}
export async function loadDaoState(address: string | null, page = 0, allProposals = false): Promise<DaoState> {
  const [info, balance, signerCount, required, delay, nextId, configuredRequired, holdings] = await Promise.all([
    daoFetch<{ tenure_height?: number }>('/v2/info'),
    daoFetch<{ balance: string }>(`/extended/v1/address/${DAO_CONTRACT}/stx`),
    readDao('get-signer-count'), readDao('get-required-sigs'), readVariable('execution-delay'), readVariable('next-id'), readVariable('required-sigs'),
    daoFetch<{ fungible_tokens: Record<string, { balance: string }> }>(`/extended/v1/address/${DAO_CONTRACT}/balances`),
  ]);
  if (!Number.isSafeInteger(info.tenure_height) || typeof signerCount !== 'string' || typeof required !== 'string') throw new Error('No se pudo leer la altura de tenure o el quorum.');
  const signers: string[] = [];
  // Batch signer reads to avoid flooding the public node.
  for (let start = 0; start < Number(signerCount); start += 5) {
    const batch = await Promise.all(Array.from({ length: Math.min(5, Number(signerCount) - start) }, (_, i) => readDao('get-signer', [uintCV(start + i)])));
    for (const signer of batch) {
      if (typeof signer !== 'string') throw new Error('Lista de firmantes incompleta.');
      signers.push(signer);
    }
  }
  const end = BigInt(nextId) - BigInt(page * DAO_PAGE_SIZE);
  const ids = Array.from({ length: Number(allProposals ? end : end > BigInt(DAO_PAGE_SIZE) ? BigInt(DAO_PAGE_SIZE) : end > BigInt(0) ? end : BigInt(0)) }, (_, i) => end - BigInt(i + 1));
  const proposals: DaoProposal[] = [];
  for (const id of ids) {
    const [proposal, hasApproved] = await Promise.all([
      readDao('get-proposal', [uintCV(id)]),
      address ? readDao('has-approved', [uintCV(id), mainnetPrincipal(address)]) : Promise.resolve(false),
    ]);
    if (!proposal || typeof proposal !== 'object') throw new Error('No se pudo leer una propuesta.');
    const entry = { ...proposal, id: id.toString(), hasApproved } as DaoProposal;
    if (entry['proposal-type'] === 'add-signer' || entry['proposal-type'] === 'replace-signer') {
      entry.signerApprovals = await loadDaoSignerApprovals(entry.id, signers);
    }
    proposals.push(entry);
  }
  const tokens: Record<string, DaoToken> = {};
  const tokenErrors: Record<string, string> = {};
  const contracts = [...new Set([
    ...Object.keys(holdings.fungible_tokens).map((asset) => asset.split('::')[0]),
    ...proposals.filter((p) => !p.executed && p['proposal-type'] === 'token-transfer' && p.token).map((p) => p.token!),
  ])];
  for (let start = 0; start < contracts.length; start += 4) {
    await Promise.all(contracts.slice(start, start + 4).map(async (contract) => {
      try { tokens[contract] = await getDaoToken(contract); }
      catch (error) { tokenErrors[contract] = error instanceof Error ? error.message : 'No se pudo consultar el token.'; }
    }));
  }
  return { height: String(info.tenure_height), balance: balance.balance, signerCount, required, configuredRequired, delay, nextId, signers, proposals, tokens, tokenErrors };
}
export async function getTokenAsset(contract: string): Promise<string> {
  mainnetPrincipal(contract, true);
  const [address, name] = contract.split('.');
  const abi = await daoFetch<{ fungible_tokens: { name: string }[] }>(`/v2/contracts/interface/${address}/${name}`);
  if (abi.fungible_tokens.length !== 1) throw new Error('Este token no expone un único activo fungible; no se puede ejecutar desde esta interfaz.');
  return abi.fungible_tokens[0].name;
}

export function executionBlockers(p: DaoProposal, state: DaoState): string[] {
  const blockers: string[] = [];
  const type = p['proposal-type'];
  if (type === 'remove-signer' || type === 'replace-signer') {
    if (!p['old-signer'] || !state.signers.includes(p['old-signer'])) blockers.push('El firmante anterior ya no pertenece al DAO.');
  }
  if (type === 'add-signer' || type === 'replace-signer') {
    if (!p['new-signer'] || state.signers.includes(p['new-signer'])) blockers.push('El nuevo firmante falta o ya pertenece al DAO.');
  }
  if (type === 'remove-signer' && (BigInt(state.signerCount) <= BigInt(1) || BigInt(state.configuredRequired) >= BigInt(state.signerCount))) {
    blockers.push('La retirada dejaría insuficientes firmantes. Reduce primero el quorum fijo.');
  }
  if (type === 'set-required-sigs' && (p['new-required'] === null || BigInt(p['new-required']) < BigInt(1) || BigInt(p['new-required']) > BigInt(state.signerCount))) {
    blockers.push('El nuevo quorum supera los firmantes disponibles o es inválido.');
  }
  if (type === 'set-exec-delay' && (p['new-delay'] === null || BigInt(p['new-delay']) > DAO_MAX_DELAY)) {
    blockers.push('Una espera de 10000 tenures o más bloquearía futuras propuestas.');
  }
  if (type === 'transfer' && BigInt(p.amount) > BigInt(state.balance)) blockers.push('La tesorería no tiene suficientes STX.');
  if (type === 'token-transfer') {
    const token = p.token ? state.tokens[p.token] : undefined;
    if (!token) blockers.push('No se pudo verificar la compatibilidad y el saldo del token.');
    else if (BigInt(p.amount) > BigInt(token.balance)) blockers.push(`La tesorería no tiene suficientes ${token.symbol}.`);
  }
  return blockers;
}

function checkDecimals(decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 38) throw new Error('Los decimales del token deben estar entre 0 y 38.');
}
export function parseDaoTokenAmount(value: string, decimals: number): string {
  checkDecimals(decimals);
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error('Ingresa una cantidad decimal positiva.');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new Error(`Este token admite hasta ${decimals} decimales.`);
  return parseDaoUint(`${whole}${fraction.padEnd(decimals, '0')}`).toString();
}
export function formatDaoTokenAmount(value: string, decimals: number): string {
  checkDecimals(decimals);
  const digits = parseDaoUint(value, true).toString().padStart(decimals + 1, '0');
  return decimals ? `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}` : digits;
}
export function validateDaoTokenAbi(abi: ClarityAbi): string {
  const transfer = abi.functions.find((fn) => fn.name === 'transfer' && fn.access === 'public');
  const expected = ['uint128', 'principal', 'principal', { optional: { buffer: { length: 34 } } }];
  if (!transfer || JSON.stringify(transfer.args.map((arg) => arg.type)) !== JSON.stringify(expected) ||
      JSON.stringify(transfer.outputs.type) !== JSON.stringify({ response: { ok: 'bool', error: 'uint128' } })) {
    throw new Error('El contrato no expone la función transfer compatible con el DAO.');
  }
  if (abi.fungible_tokens.length !== 1) throw new Error('El token debe exponer un único activo fungible.');
  return abi.fungible_tokens[0].name;
}
export async function getDaoToken(contract: string): Promise<DaoToken> {
  contract = contract.trim();
  mainnetPrincipal(contract, true);
  const [address, name] = contract.split('.');
  const abi = await daoFetch<ClarityAbi>(`/v2/contracts/interface/${address}/${name}`);
  const asset = validateDaoTokenAbi(abi);
  async function read(nameOfFunction: string, args: ClarityValue[] = []) {
    const fn = abi.functions.find((entry) => entry.name === nameOfFunction && entry.access === 'read_only');
    if (!fn) throw new Error(`El token no expone ${nameOfFunction}.`);
    const result = await daoFetch<{ okay: boolean; result?: string }>(`/v2/contracts/call-read/${address}/${name}/${nameOfFunction}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: DAO_ADDRESS, arguments: args.map(cvToHex) }),
    });
    if (!result.okay || !result.result) throw new Error(`No se pudo leer ${nameOfFunction}.`);
    return decodeDaoValue(hexToCV(result.result));
  }
  const [symbol, decimalsValue, balance] = await Promise.all([
    read('get-symbol'), read('get-decimals'), read('get-balance', [principalCV(DAO_CONTRACT)]),
  ]);
  if (typeof symbol !== 'string' || !symbol.trim() || typeof decimalsValue !== 'string' || !/^\d+$/.test(decimalsValue) || typeof balance !== 'string') {
    throw new Error('Metadatos del token inválidos.');
  }
  const decimals = Number(decimalsValue);
  checkDecimals(decimals);
  parseDaoUint(balance, true);
  return { contract, asset, symbol, decimals, balance };
}

export interface DaoApproval { address: string; txid: string }
export interface DaoApprovalPage { approvals: DaoApproval[]; nextOffset: number | null }
// Scan a bounded page of history on demand. Keep pagination visible so missing history
// is never presented as proof that nobody approved; includes former signers.
export async function loadDaoApprovals(id: string, offset = 0): Promise<DaoApprovalPage> {
  const limit = 50;
  const data = await daoFetch<{ results: { tx_id: string; contract_log?: { contract_id: string; value: { hex: string } } }[] }>(
    `/extended/v1/contract/${DAO_CONTRACT}/events?limit=${limit}&offset=${offset}`,
  );
  const approvals: DaoApproval[] = [];
  for (const event of data.results) {
    if (event.contract_log?.contract_id !== DAO_CONTRACT) continue;
    const value = decodeDaoValue(hexToCV(event.contract_log.value.hex)) as { event?: string; id?: string; by?: string };
    if (value.event === 'proposal-approved' && value.id === id && typeof value.by === 'string') approvals.push({ address: value.by, txid: event.tx_id });
  }
  return { approvals, nextOffset: data.results.length === limit ? offset + limit : null };
}

const DAO_ERRORS: Record<string, string> = {
  '100': 'La cuenta ya no es firmante.', '101': 'La propuesta ya fue ejecutada.',
  '102': 'Faltan aprobaciones.', '103': 'Esta cuenta ya aprobó.', '104': 'La propuesta no existe.',
  '105': 'La propuesta expiró.', '106': 'Debe quedar al menos un firmante.',
  '107': 'Los parámetros o el tiempo de espera ya no son válidos. Actualiza el DAO.',
  '108': 'El tipo de propuesta no es compatible.',
};
export interface DaoTransaction {
  txid: string; action: string; status: string; detail: string; proposalId?: string;
}
export const DAO_TX_STORAGE_KEY = `dao-transactions:${DAO_CONTRACT}:mainnet`;
export function restoreDaoTransactions(value: string | null): DaoTransaction[] {
  try {
    const entries: unknown = JSON.parse(value ?? '[]');
    if (!Array.isArray(entries)) return [];
    return entries.filter((t): t is DaoTransaction => Boolean(t && typeof t === 'object' &&
      /^0x[0-9a-f]{64}$/i.test(t.txid) && ['deposit', 'create-proposal', 'approve-proposal', 'execute-proposal'].includes(t.action) &&
      typeof t.status === 'string' && typeof t.detail === 'string' &&
      (t.proposalId === undefined || /^\d+$/.test(t.proposalId)))).slice(0, 20);
  } catch { return []; }
}
export function updateDaoTransaction(tx: DaoTransaction, result: { tx_status: string; tx_result?: { repr: string }; contract_call?: { function_name: string; function_args?: { repr: string }[] } }): DaoTransaction {
  const repr = result.tx_result?.repr ?? '';
  if (result.tx_status === 'pending') return { ...tx, status: 'pending', detail: 'Enviada. Esperando confirmación en mainnet.' };
  if (result.tx_status === 'success') {
    const id = tx.action === 'create-proposal' ? /^\(ok u(\d+)\)$/.exec(repr)?.[1] : tx.proposalId;
    return { ...tx, status: 'success', proposalId: id, detail: id && tx.action === 'create-proposal' ? `Propuesta #${id} creada. Debe aprobarse por separado.` : 'Confirmada en mainnet.' };
  }
  const code = /^\(err u(\d+)\)$/.exec(repr)?.[1];
  // A dynamic token call can return the token's own error namespace.
  const tokenExecution = tx.action === 'execute-proposal' && result.contract_call?.function_args?.[1]?.repr !== 'none';
  const reason = result.tx_status === 'abort_by_post_condition' ? 'Los movimientos de fondos no coincidieron con los autorizados.'
    : result.tx_status.startsWith('dropped_') ? 'La transacción salió de la mempool sin confirmarse. Revisa el explorador antes de reintentar.'
    : code && !tokenExecution && DAO_ERRORS[code] ? DAO_ERRORS[code] : `Revisa el resultado del contrato${repr ? `: ${repr}` : '.'}`;
  return { ...tx, status: result.tx_status, detail: `${reason} (${result.tx_status})` };
}


export async function loadDaoSignerApprovals(id: string, signers: string[]): Promise<Record<string, boolean>> {
  const approvals: Record<string, boolean> = {};
  for (let start = 0; start < signers.length; start += 5) {
    const batch = await Promise.all(signers.slice(start, start + 5).map(async (signer) => {
      const approved = await readDao('has-approved', [uintCV(id), mainnetPrincipal(signer)]);
      if (typeof approved !== 'boolean') throw new Error('No se pudo verificar la aprobación del firmante.');
      return [signer, approved] as const;
    }));
    for (const [signer, approved] of batch) approvals[signer] = approved;
  }
  return approvals;
}
