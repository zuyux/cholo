import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DaoSignerWorkflow from './DaoSignerWorkflow';
import { DAO_ADDRESS, type DaoProposal, type DaoState } from '../lib/cholo-dao';

vi.mock('./DaoSignerWorkflow.module.css', () => ({ default: {} }));
vi.mock('../app/dao/page.module.css', () => ({ default: {} }));

const incoming = 'ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ';
const second = 'ST36HHQ5RHSXDHZBWG3W1HWTEPCBZSCX6F12R994M';
const state: DaoState = { height: '105', balance: '0', signerCount: '2', required: '2', configuredRequired: '2', delay: '10', nextId: '5', signers: [DAO_ADDRESS, second], proposals: [], tokens: {}, tokenErrors: {} };
const proposal: DaoProposal = { id: '4', recipient: DAO_ADDRESS, amount: '0', approvals: '1', executed: false, 'proposal-type': 'add-signer', 'new-signer': incoming, 'old-signer': null, token: null, description: 'Add signer', expiration: '200', created: '100', 'new-required': null, 'new-delay': null, hasApproved: false, signerApprovals: { [DAO_ADDRESS]: true, [second]: false } };
function render(address: string | null, changes: Partial<DaoProposal> = {}, stateChanges: Partial<DaoState> = {}) {
  return renderToStaticMarkup(createElement(DaoSignerWorkflow, { proposal: { ...proposal, ...changes }, state: { ...state, ...stateChanges }, address, disabled: !address, onApprove() {}, onExecute() {} }));
}
const enabled = (html: string, label: string) => (html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [])
  .some((button) => !/^<button[^>]*\bdisabled/.test(button) && button.includes(label));

describe('signer proposal workflow', () => {
  it('explains incoming signer restrictions and directs connection through navigation', () => {
    const html = render(incoming);
    expect(html).toContain('Todavía no puedes aprobar tu incorporación');
    expect(html).toContain(DAO_ADDRESS);
    expect(html).toContain(second);
    expect(enabled(html, 'Aprobar propuesta #4')).toBe(false);
    expect(html).not.toContain('Conectar otra cuenta firmante');
  });
  it('lets an eligible current signer approve and directs an existing approver to another account', () => {
    expect(enabled(render(second), 'Aprobar propuesta #4')).toBe(true);
    const html = render(DAO_ADDRESS, { hasApproved: true });
    expect(html).toContain('Tu aprobación ya está registrada');
    expect(html).not.toContain('Conectar otra cuenta firmante');
  });
  it('directs disconnected users to navigation and disables transactions', () => {
    const html = render(null);
    expect(html).toContain('desde el menú de navegación');
    expect(enabled(html, 'Aprobar propuesta #4')).toBe(false);
    expect(enabled(html, 'Ejecutar propuesta #4')).toBe(false);
    expect(html).not.toContain('connect-wallet.svg');
  });
  it('requires the delay even after quorum, then permits incoming account execution', () => {
    const html = render(incoming, { approvals: '2' });
    expect(html).toContain('No hacen falta más aprobaciones');
    expect(html).toContain('5 tenures restantes');
    expect(enabled(html, 'Ejecutar propuesta #4')).toBe(false);
    expect(enabled(render(incoming, { approvals: '2' }, { height: '110' }), 'Ejecutar propuesta #4')).toBe(true);
  });
  it('does not offer approval or execution for expired and completed proposals', () => {
    expect(render(second, {}, { height: '200' })).toContain('Esta propuesta expiró');
    for (const html of [render(second, {}, { height: '200' }), render(second, { executed: true })]) {
      expect(html).not.toContain('Aprobar propuesta #4');
      expect(html).not.toContain('Ejecutar propuesta #4');
    }
  });
});
