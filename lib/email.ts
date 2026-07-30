import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const configuredFromAddress = process.env.RESEND_FROM_EMAIL?.trim();
const isTestApiKey = Boolean(resendApiKey?.startsWith('re_test_'));
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

const normalizeFromAddress = (value?: string) => {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const standardDisplayName = trimmed.match(/^(.+?)\s+<([^<>@\s]+@[^<>@\s]+)>$/);
  if (standardDisplayName) return trimmed;

  const bareEmail = trimmed.match(/^[^<>@\s]+@[^<>@\s]+$/);
  if (bareEmail) return trimmed;

  const wrappedEmail = trimmed.match(/^<([^<>@\s]+@[^<>@\s]+)>$/);
  if (wrappedEmail) return wrappedEmail[1];

  const wrappedNameAndEmail = trimmed.match(/^<(.+?)\s+([^<>@\s]+@[^<>@\s]+)>$/);
  if (wrappedNameAndEmail) {
    return `${wrappedNameAndEmail[1].trim()} <${wrappedNameAndEmail[2]}>`;
  }

  return trimmed;
};

const resendFromAddress = normalizeFromAddress(configuredFromAddress);

const simulateEmailSend = (options: EmailOptions, reason: string) => {
  console.warn(`📧 Email delivery skipped (${reason}).`);
  console.log('📧 [SIMULATED SEND]', {
    to: options.to,
    subject: options.subject,
    from: options.from || resendFromAddress || 'Configure RESEND_FROM_EMAIL',
  });
  return { success: true, messageId: `${reason}-${Date.now()}` };
};

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export async function sendEmail(options: EmailOptions) {
  try {
    if (!resendFromAddress) {
      const message = 'RESEND_FROM_EMAIL is not configured. Set it to a verified sender, like noreply@example.com or CHOLO <noreply@example.com>.';
      if (process.env.NODE_ENV !== 'production') {
        return simulateEmailSend(options, 'missing-from-address');
      }
      throw new Error(message);
    }

    if (!resendClient) {
      if (process.env.NODE_ENV !== 'production') {
        return simulateEmailSend(options, 'missing-api-key');
      }
      throw new Error('Resend API key is not configured. Set RESEND_API_KEY to send emails.');
    }

    if (isTestApiKey) {
      const warning = 'RESEND_API_KEY starts with re_test_. Test keys do not deliver real emails. Create a Live API key in the Resend dashboard.';
      if (process.env.NODE_ENV !== 'production') {
        console.warn(warning);
        return simulateEmailSend(options, 'test-api-key');
      }
      throw new Error(warning);
    }

    const to = Array.isArray(options.to) ? options.to : [options.to];
    const from = normalizeFromAddress(options.from) || resendFromAddress;

    const { data, error } = await resendClient.emails.send({
      from,
      to,
      subject: options.subject,
      html: options.html,
      cc: options.cc,
      bcc: options.bcc,
    });

    if (error) {
      throw new Error(error.message ?? 'Resend failed to send email');
    }

    const messageId = data?.id ?? 'resend-' + Date.now();
    console.log('✅ Email sent successfully:', messageId);
    return { success: true, messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw new Error('Failed to send email: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Email templates
export const emailTemplates = {
  waitlistWelcome: (email: string) => ({
    subject: "¡Bienvenido a la lista de espera de CHOLO!",
    html: `
      <div style="background:#000;padding:32px 24px;color:#fff;font-family:'Jersey 10',cursive;">
      <div style="background:#000;padding:32px 24px;border-radius:16px;text-align:center;max-width:480px;margin:auto;">
        <h1 style="color:#ff8a00;font-size:2rem;font-weight:700;margin-bottom:12px;letter-spacing:1px;">¡Bienvenido a la lista de espera de CHOLO!</h1>
        <p style="font-size:1.1rem;margin-bottom:18px;">Hola <b>${email}</b>,</p>
        <p style="font-size:1rem;margin-bottom:18px;">Nos alegra que te unas al registro de software de código abierto verificado y soberanía digital.<br />
        Serás de los primeros en conocer funciones exclusivas, novedades y oportunidades de acceso anticipado.</p>
        <div style="margin:24px 0;">
          <a href="https://cholo.app" style="display:inline-block;padding:12px 32px;background:#ff006a;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:1.1rem;box-shadow:0 2px 8px #0002;">Visitar CHOLO</a>
        </div>
        <hr style="border:none;border-top:1px solid #333;margin:32px 0;" />
        <p style="color:#898989;font-size:13px;">CHOLO &mdash; el perro que nunca obdc</p>
      </div>
      </div>
    `
  }),

  accountCreated: ({ bitcoinAddress, verifyUrl, removeUrl, expiresInHours }: {
    bitcoinAddress: string;
    verifyUrl: string;
    removeUrl: string;
    expiresInHours: number;
  }) => ({
    subject: "Tu cuenta CHOLO fue creada correctamente",
    html: `
      <div style="background:#000;padding:32px 24px;color:#fff;font-family:'Jersey 10',cursive;">
      <div style="background:#000;padding:32px 24px;border-radius:16px;max-width:600px;margin:auto;">
        <h2 style="color:#ff8a00;margin-bottom:20px;">¡Bienvenido a CHOLO! Nos alegra tenerte aquí.</h2>
        <p>Tu cuenta fue creada correctamente. Ahora formas parte de una comunidad que ayuda a descubrir, apoyar y preservar software de código abierto confiable.</p>

        <div style="margin:28px 0;padding:24px;border:1px solid #2f2f33;border-radius:12px;background:#000;">
          <h3 style="margin-top:0;color:#ff8a00;">¿Qué es CHOLO?</h3>
          <p style="margin:8px 0;color:#e5e5e5;"><strong>CHOLO significa Bitcoin Box</strong>: un espacio abierto para software íntegro y las personas que lo crean.</p>
          <p style="margin:12px 0 0;color:#e5e5e5;">CHOLO es un registro y una capa de financiamiento anclados en Bitcoin. Aquí cualquiera puede descubrir aplicaciones de código abierto verificadas, revisar información transparente, apoyar bienes públicos y seguir el trabajo de cada proyecto. Los creadores conservan el control de sus registros mientras Bitcoin aporta una base duradera y auditable.</p>
        </div>

        <p><strong>Dirección de Bitcoin:</strong> <code style="background:#000;border:1px solid #333;padding:4px 8px;border-radius:4px;color:#fff;">${bitcoinAddress}</code></p>

        <div style="margin:28px 0;padding:24px;border:1px solid #2f2f33;border-radius:12px;background:#000;">
          <h3 style="margin-top:0;color:#ff8a00;">Verifica tu correo electrónico</h3>
          <p style="margin:8px 0 18px;color:#e5e5e5;">Haz clic abajo para confirmar que este correo te pertenece. La verificación es opcional, pero ayuda a proteger tu cuenta.</p>
          <div style="text-align:center;margin-bottom:18px;">
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 26px;background:#00c2ff;color:#050505;border-radius:8px;font-weight:600;text-decoration:none;">Verificar correo</a>
          </div>
          <p style="margin:0;font-size:13px;color:#9ca3af;">Si no verificas ni eliminas este correo dentro de ${expiresInHours} horas, lo consideraremos verificado automáticamente.</p>
        </div>

        <div style="margin:28px 0;padding:24px;border:1px solid #2f2f33;border-radius:12px;background:#000;">
          <h3 style="margin-top:0;color:#ff8a00;">¿No creaste esta billetera?</h3>
          <p style="margin:8px 0 18px;color:#f5d0d0;">Usa el enlace dentro de ${expiresInHours} horas para quitar tu correo de esta billetera y poder registrarlo en otra.</p>
          <div style="text-align:center;margin-bottom:8px;">
            <a href="${removeUrl}" style="display:inline-block;padding:12px 26px;background:#ff3b3b;color:#050505;border-radius:8px;font-weight:600;text-decoration:none;">Quitar mi correo</a>
          </div>
          <p style="margin:0;font-size:13px;color:#f5d0d0;">Después de ${expiresInHours} horas, el correo quedará vinculado a esta billetera salvo que contactes a soporte.</p>
        </div>

        <div style="background:#000;border:1px solid #2f2f33;padding:16px;border-radius:8px;margin:20px 0;">
          <p style="margin:0;color:#ff8a00;"><strong>⚠️ Aviso importante de seguridad:</strong></p>
          <p style="margin:8px 0 0 0;">Protege tu frase mnemónica o semilla. Nunca la compartas con nadie. Es la única forma de recuperar tu billetera.</p>
        </div>
        <p style="color:#898989;font-size:13px;">CHOLO &mdash; el perro que nunca obdc</p>
      </div>
      </div>
    `
  }),

  verifiedAccountCreated: ({ bitcoinAddress }: {
    bitcoinAddress: string;
  }) => ({
    subject: "Tu cuenta CHOLO fue creada correctamente",
    html: `
      <div style="background:#000;padding:32px 24px;color:#fff;font-family:Arial,sans-serif;">
      <div style="background:#000;padding:32px 24px;border-radius:16px;max-width:600px;margin:auto;">
        <h2 style="color:#ff8a00;margin-bottom:20px;">¡Bienvenido a CHOLO! Nos alegra tenerte aquí.</h2>
        <p>Tu correo fue verificado y tu cuenta está lista. Ahora formas parte de una comunidad que ayuda a descubrir, apoyar y preservar software de código abierto confiable.</p>

        <div style="margin:28px 0;padding:24px;border:1px solid #2f2f33;border-radius:12px;background:#000;">
          <h3 style="margin-top:0;color:#ff8a00;">¿Qué es CHOLO?</h3>
          <p style="margin:8px 0;color:#e5e5e5;"><strong>CHOLO significa Bitcoin Box</strong>: un espacio abierto para software íntegro y las personas que lo crean.</p>
          <p style="margin:12px 0 0;color:#e5e5e5;">CHOLO es un registro y una capa de financiamiento anclados en Bitcoin para descubrir aplicaciones verificadas, revisar información transparente y apoyar bienes públicos. Los creadores conservan el control de sus registros mientras Bitcoin aporta una base duradera y auditable.</p>
        </div>

        <p><strong>Dirección de Bitcoin:</strong> <code style="background:#000;border:1px solid #333;padding:4px 8px;border-radius:4px;color:#fff;">${bitcoinAddress}</code></p>
        <div style="background:#000;border:1px solid #2f2f33;padding:16px;border-radius:8px;margin:20px 0;">
          <p style="margin:0;color:#ff8a00;"><strong>Aviso importante de seguridad:</strong></p>
          <p style="margin:8px 0 0 0;">Protege tu frase mnemónica o semilla. Nunca la compartas con nadie. Es la única forma de recuperar tu billetera.</p>
        </div>
        <p style="color:#898989;font-size:13px;">CHOLO &mdash; el perro que nunca obdc</p>
      </div>
      </div>
    `
  }),

  emailVerificationCode: ({ code, expiresInMinutes }: {
    code: string;
    expiresInMinutes: number;
  }) => ({
    subject: "Tu código de verificación de CHOLO",
    html: `
      <div style="background:#000;padding:32px 24px;color:#fff;font-family:Arial,sans-serif;">
      <div style="background:#000;padding:32px 24px;border-radius:16px;max-width:520px;margin:auto;">
        <h2 style="color:#ff8a00;margin:0 0 18px;">Verifica tu correo electrónico</h2>
        <p style="margin:0 0 18px;color:#e5e5e5;">Ingresa este código para continuar creando tu billetera CHOLO.</p>
        <div style="letter-spacing:8px;font-size:32px;font-weight:700;text-align:center;background:#000;border:1px solid #2f2f33;border-radius:12px;padding:22px;margin:24px 0;color:#fff;">
          ${code}
        </div>
        <p style="margin:0 0 14px;color:#9ca3af;font-size:14px;">Este código vence en ${expiresInMinutes} minutos.</p>
        <p style="margin:0;color:#9ca3af;font-size:14px;">Si no solicitaste este código, puedes ignorar este correo.</p>
        <p style="color:#898989;font-size:12px;margin-top:28px;">CHOLO &mdash; el perro que nunca obdc</p>
      </div>
      </div>
    `
  }),

  walletConnectionLink: (connectionUrl: string) => ({
    subject: "🔐 Enlace para conectar tu cuenta - CHOLO",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conexión de cuenta</title>
      </head>
      <body style="background:#000;font-family:Arial,sans-serif;line-height:1.6;color:#fff;margin:0;padding:20px;">
        <div style="background:#000;max-width:600px;margin:0 auto;">
        <div style="background:#000;padding:30px;border:1px solid #2f2f33;border-radius:10px 10px 0 0;text-align:center;">
          <h1 style="color:#ff8a00;margin:0;font-size:24px;">🔐 Conexión de cuenta</h1>
        </div>
        
        <div style="background:#000;padding:30px;border-radius:0 0 10px 10px;border:1px solid #2f2f33;">
          <h2 style="color:#ff8a00;margin-top:0;">Conecta tu cuenta</h2>
          
          <p>¡Hola!</p>
          
          <p>Solicitaste conectar tu cuenta a CHOLO. Haz clic en el botón para completar el proceso:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${connectionUrl}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Conectar cuenta
            </a>
          </div>
          
          <p style="color:#b3b3b3;font-size:14px;margin-top:30px;">
            <strong>Importante:</strong> Por seguridad, este enlace vencerá en 30 minutos.
          </p>
          
          <p style="color:#b3b3b3;font-size:14px;">
            Si no solicitaste esta conexión, puedes ignorar este correo.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            Este correo fue enviado por la plataforma CHOLO.<br>
            Si no puedes hacer clic en el botón, copia y pega este enlace: ${connectionUrl}
          </p>
        </div>
        </div>
      </body>
      </html>
    `
  })
};
