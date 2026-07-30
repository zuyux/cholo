import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type and data' },
        { status: 400 }
      );
    }

    if (type === 'app-submission') {
      // Validate required data for app submission
      if (!data.appName || !data.userEmail || !data.publisherName) {
        return NextResponse.json(
          { error: 'Missing required app submission data' },
          { status: 400 }
        );
      }

      // Send confirmation email to user
      await sendEmail({
        to: data.userEmail,
        subject: `✅ Tu aplicación "${data.appName}" fue enviada correctamente`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
            <div style="background: linear-gradient(135deg, #ff6b6b, #ff006a); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🎉 ¡Envío realizado correctamente!</h1>
            </div>
            
            <div style="background: white; padding: 40px 30px; margin: 0;">
              <h2 style="color: #ff006a; margin-top: 0; font-size: 22px;">¡Hola, ${data.publisherName}!</h2>
              
              <p style="font-size: 16px; line-height: 1.8;">
                ¡Gracias por enviar <strong>${data.appName}</strong> a CHOLO! Tu aplicación está en revisión.
              </p>
              
              <div style="background: #f8f9fa; border-left: 4px solid #ff006a; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #333; font-size: 18px;">📋 ¿Qué sucede ahora?</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li style="margin: 8px 0;">Nuestro equipo revisará tu envío en un plazo de 24 a 48 horas.</li>
                  <li style="margin: 8px 0;">Verificaremos todos los enlaces y metadatos.</li>
                  <li style="margin: 8px 0;">Recibirás un correo cuando tu aplicación sea aprobada.</li>
                  <li style="margin: 8px 0;">Tu aplicación se publicará en CHOLO para la comunidad de software soberano.</li>
                </ul>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>⚡ Consejo:</strong> Mientras esperas, comprueba que tu sitio web y documentación estén actualizados. Una buena primera impresión ayuda a conseguir más descargas.
                </p>
              </div>

              <div style="text-align: center; margin: 35px 0;">
                <a href="https://cholo.app/apps"
                   style="display: inline-block; background: #ff006a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 0, 106, 0.3);">
                  Explorar aplicaciones en CHOLO
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #eee; margin: 35px 0;">
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                ¿Tienes preguntas? Responde a este correo o escríbenos a
                <a href="mailto:fabohax@gmail.com" style="color: #ff006a; text-decoration: none;">fabohax@gmail.com</a>
              </p>
            </div>

            <div style="background: #18181b; color: #888; padding: 25px 30px; text-align: center;">
              <p style="margin: 0; font-size: 13px;">
                <strong style="color: #ff006a;">CHOLO</strong> — el perro que nunca obdc
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px;">
                Construyendo infraestructura de coordinación permanente para software de código abierto.
              </p>
            </div>
          </body>
          </html>
        `
      });

      console.log('✅ Confirmation email sent to user:', data.userEmail);

      // Send notification email to admin (fabohax@gmail.com)
      await sendEmail({
        to: 'fabohax@gmail.com',
        subject: `🚀 Nueva aplicación enviada: ${data.appName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Courier New', monospace; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background: #18181b; color: white; padding: 25px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🚀 Nueva aplicación enviada</h1>
              <p style="margin: 10px 0 0 0; color: #888; font-size: 14px;">Notificación administrativa de CHOLO</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #ff006a; margin-top: 0; border-bottom: 2px solid #ff006a; padding-bottom: 10px;">
                ${data.appName}
              </h2>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <tr style="background: #f8f9fa;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600; width: 180px;">Nombre de la aplicación</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.appName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Versión</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.version || 'N/A'}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Categoría</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.category || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Nombre del editor</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.publisherName}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Correo del editor</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">
                    <a href="mailto:${data.userEmail}" style="color: #ff006a; text-decoration: none;">${data.userEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Dirección de billetera</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-family: monospace; font-size: 12px; word-break: break-all;">${data.publisherAddress || 'N/A'}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Sitio web</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">
                    ${data.websiteUrl ? `<a href="${data.websiteUrl}" target="_blank" style="color: #ff006a;">${data.websiteUrl}</a>` : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">GitHub</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">
                    ${data.githubUrl ? `<a href="${data.githubUrl}" target="_blank" style="color: #ff006a;">${data.githubUrl}</a>` : 'N/A'}
                  </td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Modelo de precios</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.pricingModel || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Licencia</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.license || 'N/A'}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Código abierto</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.openSource ? '✅ Sí' : '❌ No'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Compatibilidad con Lightning</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.acceptsLightning ? '⚡ Sí' : '❌ No'}</td>
                </tr>
              </table>

              <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px;">📝 Descripción</h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.6;">${data.description || 'No se proporcionó una descripción'}</p>
              </div>

              ${data.tags && data.tags.length > 0 ? `
              <div style="margin: 20px 0;">
                <strong style="color: #666;">Etiquetas:</strong>
                <div style="margin-top: 8px;">
                  ${data.tags.map((tag: string) => `<span style="display: inline-block; background: #e9ecef; padding: 4px 12px; margin: 4px; border-radius: 12px; font-size: 13px;">${tag}</span>`).join('')}
                </div>
              </div>
              ` : ''}

              ${data.platforms && data.platforms.length > 0 ? `
              <div style="margin: 20px 0;">
                <strong style="color: #666;">Plataformas:</strong>
                <div style="margin-top: 8px;">
                  ${data.platforms.map((platform: string) => `<span style="display: inline-block; background: #d1ecf1; padding: 4px 12px; margin: 4px; border-radius: 12px; font-size: 13px;">${platform}</span>`).join('')}
                </div>
              </div>
              ` : ''}

              ${data.supportedNetworks && data.supportedNetworks.length > 0 ? `
              <div style="margin: 20px 0;">
                <strong style="color: #666;">Redes compatibles:</strong>
                <div style="margin-top: 8px;">
                  ${data.supportedNetworks.map((network: string) => `<span style="display: inline-block; background: #fff3cd; padding: 4px 12px; margin: 4px; border-radius: 12px; font-size: 13px;">${network}</span>`).join('')}
                </div>
              </div>
              ` : ''}

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #155724;">
                  <strong>⚡ Acción requerida:</strong> Revisa este envío en Supabase y apruébalo o recházalo.
                </p>
              </div>

              <div style="text-align: center; margin: 25px 0;">
                <a href="https://cholo.app/apps"
                   style="display: inline-block; background: #ff006a; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  Ver todas las aplicaciones
                </a>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p style="margin: 0;">Esta es una notificación automática de CHOLO.</p>
            </div>
          </body>
          </html>
        `
      });

      console.log('✅ Notification email sent to admin');

      return NextResponse.json({
        success: true,
        message: 'Emails sent successfully'
      });
    }

    if (type === 'ownership-claim') {
      if (!data.appName || !data.claimantName || !data.claimantEmail || !data.walletAddress || !data.proof) {
        return NextResponse.json(
          { error: 'Missing required ownership claim data' },
          { status: 400 }
        );
      }

      const appName = escapeHtml(data.appName);
      const appId = escapeHtml(data.appId || 'N/A');
      const appUrl = escapeHtml(data.appUrl || 'N/A');
      const websiteUrl = escapeHtml(data.websiteUrl || 'N/A');
      const claimantName = escapeHtml(data.claimantName);
      const claimantEmail = escapeHtml(data.claimantEmail);
      const walletAddress = escapeHtml(data.walletAddress);
      const proof = escapeHtml(data.proof).replace(/\n/g, '<br />');

      await sendEmail({
        to: '40230@pm.me',
        subject: `Solicitud de propiedad en CHOLO: ${data.appName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 680px; margin: 0 auto; padding: 20px; background-color: #f6f7f9;">
            <div style="background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 22px;">Solicitud de propiedad</h1>
              <p style="margin: 8px 0 0; color: #cbd5e1;">Solicitud para verificar la propiedad de una aplicación en CHOLO</p>
            </div>

            <div style="background: #ffffff; padding: 28px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
              <h2 style="margin-top: 0; color: #0f172a;">${appName}</h2>

              <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700; width: 170px;">App ID</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${appId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700;">Página en CHOLO</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; word-break: break-all;">${appUrl}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700;">Sitio web</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; word-break: break-all;">${websiteUrl}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700;">Solicitante</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${claimantName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700;">Correo electrónico</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${claimantEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700;">Billetera / Dirección</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; word-break: break-all;">${walletAddress}</td>
                </tr>
              </table>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                <h3 style="margin: 0 0 8px; font-size: 16px;">Detalles de la prueba</h3>
                <p style="margin: 0; font-size: 14px;">${proof}</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      return NextResponse.json({
        success: true,
        message: 'Ownership claim sent successfully'
      });
    }

    return NextResponse.json(
      { error: 'Invalid email type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send emails',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
