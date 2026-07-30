import { sendEmail } from '@/lib/email';

const ACCOUNT_ACTIVITY_NOTIFICATION_EMAIL =
  process.env.ACCOUNT_ACTIVITY_NOTIFICATION_EMAIL?.trim() || '40230@pm.me';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type AccountActivity =
  | {
      type: 'account-created';
      address: string;
      email: string;
    }
  | {
      type: 'wallet-sign-in';
      address: string;
      provider: string;
    };

export async function sendAccountActivityNotification(activity: AccountActivity) {
  const occurredAt = new Date().toISOString();
  const isAccountCreated = activity.type === 'account-created';
  const title = isAccountCreated ? 'Nueva cuenta CHOLO creada' : 'Inicio de sesión en billetera CHOLO';
  const details = isAccountCreated
    ? `
        <p><strong>Correo electrónico:</strong> ${escapeHtml(activity.email)}</p>
        <p><strong>Dirección de billetera:</strong> ${escapeHtml(activity.address)}</p>
      `
    : `
        <p><strong>Proveedor:</strong> ${escapeHtml(activity.provider)}</p>
        <p><strong>Dirección de billetera:</strong> ${escapeHtml(activity.address)}</p>
      `;

  return sendEmail({
    to: ACCOUNT_ACTIVITY_NOTIFICATION_EMAIL,
    subject: isAccountCreated
      ? 'Un nuevo usuario creó una cuenta CHOLO'
      : `Inicio de sesión mediante ${activity.provider}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#18181b;">
        <h2>${title}</h2>
        ${details}
        <p><strong>Fecha y hora:</strong> ${occurredAt}</p>
      </div>
    `,
  });
}
