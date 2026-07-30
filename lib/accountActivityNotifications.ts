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
  const title = isAccountCreated ? 'New CHOLO account created' : 'CHOLO wallet sign-in';
  const details = isAccountCreated
    ? `
        <p><strong>Email:</strong> ${escapeHtml(activity.email)}</p>
        <p><strong>Wallet address:</strong> ${escapeHtml(activity.address)}</p>
      `
    : `
        <p><strong>Provider:</strong> ${escapeHtml(activity.provider)}</p>
        <p><strong>Wallet address:</strong> ${escapeHtml(activity.address)}</p>
      `;

  return sendEmail({
    to: ACCOUNT_ACTIVITY_NOTIFICATION_EMAIL,
    subject: isAccountCreated
      ? 'New user created a CHOLO account'
      : `Wallet sign-in via ${activity.provider}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#18181b;">
        <h2>${title}</h2>
        ${details}
        <p><strong>Time:</strong> ${occurredAt}</p>
      </div>
    `,
  });
}
