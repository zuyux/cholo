'use client';

import { proposalStatus, type DaoProposal, type DaoState } from '../lib/cholo-dao';
import DaoIdentity from './DaoIdentity';
import styles from './DaoSignerWorkflow.module.css';

interface Props {
  proposal: DaoProposal;
  state: DaoState;
  address: string | null;
  disabled: boolean;
  onApprove: () => void;
  onExecute: () => void;
}

export default function DaoSignerWorkflow({ proposal: p, state, address, disabled, onApprove, onExecute }: Props) {
  const status = proposalStatus(p, state);
  const enoughApprovals = BigInt(p.approvals) >= BigInt(state.required);
  const canSign = Boolean(address && state.signers.includes(address));
  const incoming = address === p['new-signer'] && !canSign;
  const active = !p.executed && !status.expired;
  const currentStep = !enoughApprovals ? 1 : status.remaining !== '0' ? 2 : 3;
  const steps = [
    { title: 'Crear', complete: true, detail: `Propuesta #${p.id} confirmada. Crear no equivale a aprobar.` },
    { title: 'Aprobar', complete: p.executed || enoughApprovals, detail: p.executed ? `${p.approvals} aprobaciones registradas.` : `${p.approvals} de ${state.required} aprobaciones necesarias. Cada cuenta cuenta una sola vez.` },
    { title: 'Esperar', complete: p.executed || status.remaining === '0', detail: p.executed ? 'Espera cumplida al ejecutar.' : status.remaining === '0' ? 'Espera cumplida.' : `${status.remaining} tenures restantes, hasta la altura ${status.executableAt}.` },
    { title: 'Ejecutar', complete: p.executed, detail: p.executed ? 'Cambio de firmante ejecutado.' : 'Cualquier cuenta mainnet puede ejecutar una vez cumplidas las condiciones.' },
  ];
  const recordedCurrentApprovals = Object.values(p.signerApprovals ?? {}).filter(Boolean).length;

  return <section className={styles.workflow} aria-labelledby={`workflow-${p.id}`}>
    <h4 id={`workflow-${p.id}`}>Proceso para {p['proposal-type'] === 'replace-signer' ? 'reemplazar' : 'agregar'} al firmante</h4>
    <p>El nuevo firmante podrá autorizar decisiones del DAO. Por eso, los firmantes actuales deben aprobar su incorporación.</p>
    <ol className={styles.steps}>
      {steps.map((step, index) => <li key={step.title} data-complete={step.complete} aria-current={active && index === currentStep ? 'step' : undefined}>
        <strong>{index + 1}. {step.title} · {step.complete ? 'Completado' : status.expired ? 'Sin completar' : 'Pendiente'}</strong>
        <p>{step.detail}</p>
      </li>)}
    </ol>
    <p>La espera empieza al crear la propuesta y transcurre mientras se reúnen las aprobaciones. Aprobar no ejecuta el cambio automáticamente.</p>
    {status.expired && !p.executed && <p role="status">Esta propuesta expiró. Un firmante actual debe crear otra para reiniciar el proceso.</p>}
    <details open={active} className={styles.signers}>
      <summary>{active ? `Quién puede aprobar: ${state.required} de ${state.signerCount} firmantes actuales` : 'Firmantes actuales y aprobaciones registradas'}</summary>
      <ul>{state.signers.map((signer, index) => {
        const approved = p.signerApprovals?.[signer];
        return <li key={signer}>
          <span>Firmante {index + 1}{signer === address ? ' · Tu cuenta' : ''}</span>
          <span className={styles.address}><DaoIdentity address={signer} /></span>
          <strong>{approved === true ? 'Aprobó' : approved === false ? active ? 'No ha aprobado' : 'Sin aprobación registrada' : 'Aprobación sin verificar'}</strong>
        </li>;
      })}</ul>
      <p>Las aprobaciones de antiguos firmantes también siguen contando. {p.signerApprovals && BigInt(p.approvals) > BigInt(recordedCurrentApprovals) ? 'El total incluye aprobaciones que no aparecen en la lista actual. ' : ''}Consulta el historial de aprobaciones debajo.</p>
    </details>
    {active && <div className={styles.nextAction}>
      <h4>Tu siguiente paso</h4>
      {!address ? <p>Conecta una cuenta firmante desde el menú de navegación para aprobar. Para ejecutar basta cualquier cuenta mainnet, con STX para la comisión.</p>
        : incoming ? <p>Estás conectado como el nuevo firmante. Todavía no puedes aprobar tu incorporación: deben hacerlo los firmantes actuales.</p>
        : !canSign ? <p>Tu cuenta es observadora y no puede aprobar. Cambia a una de las cuentas firmantes de la lista desde el menú de conexión.</p>
        : p.hasApproved ? <p>Tu aprobación ya está registrada.{!enoughApprovals ? ' Falta la aprobación de otra cuenta firmante; cambia de cuenta desde el menú de conexión.' : ' Ya se alcanzó el número de aprobaciones requerido.'}</p>
        : <p>Tu cuenta es firmante actual. Revisa la dirección propuesta y pulsa Aprobar; confirma la transacción en tu wallet y espera su confirmación.</p>}
      {enoughApprovals && <p>No hacen falta más aprobaciones.{status.remaining !== '0' ? ` Espera ${status.remaining} tenures y luego ejecuta.` : status.ready ? ' Ya puedes ejecutar el cambio.' : ' Revisa los bloqueos indicados en la propuesta antes de ejecutar.'}</p>}
      <div className={styles.actions}>
        <button type="button" disabled={disabled || !canSign || p.hasApproved || enoughApprovals} onClick={onApprove}>
          {p.hasApproved ? 'Tu aprobación está confirmada' : `Aprobar propuesta #${p.id}`}
        </button>
        <button type="button" disabled={disabled || !status.ready} onClick={onExecute}>Ejecutar propuesta #{p.id}</button>
      </div>
      <p>Si falta otra aprobación, comparte el ID #{p.id} con un firmante actual. Debe abrir /dao, conectar su propia cuenta desde el menú de navegación y aprobar esta misma propuesta.</p>
    </div>}
  </section>;
}
