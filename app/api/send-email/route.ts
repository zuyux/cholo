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
        subject: `✅ Your app "${data.appName}" has been submitted successfully`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
            <div style="background: linear-gradient(135deg, #ff6b6b, #ff006a); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🎉 Submission Successful!</h1>
            </div>
            
            <div style="background: white; padding: 40px 30px; margin: 0;">
              <h2 style="color: #ff006a; margin-top: 0; font-size: 22px;">Hi ${data.publisherName}!</h2>
              
              <p style="font-size: 16px; line-height: 1.8;">
                Thank you for submitting <strong>${data.appName}</strong> to CHOLO! Your app is now under review.
              </p>
              
              <div style="background: #f8f9fa; border-left: 4px solid #ff006a; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #333; font-size: 18px;">📋 What happens next?</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li style="margin: 8px 0;">Our team will review your submission within 24-48 hours</li>
                  <li style="margin: 8px 0;">We'll verify all links and metadata</li>
                  <li style="margin: 8px 0;">You'll receive an email once your app is approved</li>
                  <li style="margin: 8px 0;">Your app will then be live on CHOLO for the sovereign software community!</li>
                </ul>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>⚡ Pro Tip:</strong> While you wait, make sure your website and documentation are up to date. A great first impression helps drive more downloads!
                </p>
              </div>

              <div style="text-align: center; margin: 35px 0;">
                <a href="https://cholo.app/apps"
                   style="display: inline-block; background: #ff006a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 0, 106, 0.3);">
                  Browse CHOLO Apps
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #eee; margin: 35px 0;">
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Questions? Reply to this email or reach out to us at 
                <a href="mailto:fabohax@gmail.com" style="color: #ff006a; text-decoration: none;">fabohax@gmail.com</a>
              </p>
            </div>

            <div style="background: #18181b; color: #888; padding: 25px 30px; text-align: center;">
              <p style="margin: 0; font-size: 13px;">
                <strong style="color: #ff006a;">CHOLO</strong> — The Universal Registry for Verified Software
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px;">
                Building permanent coordination infrastructure for open-source software.
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
        subject: `🚀 New App Submission: ${data.appName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Courier New', monospace; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background: #18181b; color: white; padding: 25px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🚀 New App Submission</h1>
              <p style="margin: 10px 0 0 0; color: #888; font-size: 14px;">CHOLO Admin Notification</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #ff006a; margin-top: 0; border-bottom: 2px solid #ff006a; padding-bottom: 10px;">
                ${data.appName}
              </h2>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <tr style="background: #f8f9fa;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600; width: 180px;">App Name</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.appName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Version</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.version || 'N/A'}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Category</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.category || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Publisher Name</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.publisherName}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Publisher Email</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">
                    <a href="mailto:${data.userEmail}" style="color: #ff006a; text-decoration: none;">${data.userEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Wallet Address</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-family: monospace; font-size: 12px; word-break: break-all;">${data.publisherAddress || 'N/A'}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Website</td>
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
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Pricing Model</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.pricingModel || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">License</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.license || 'N/A'}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Open Source</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.openSource ? '✅ Yes' : '❌ No'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: 600;">Lightning Support</td>
                  <td style="padding: 12px; border: 1px solid #dee2e6;">${data.acceptsLightning ? '⚡ Yes' : '❌ No'}</td>
                </tr>
              </table>

              <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px;">📝 Description</h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.6;">${data.description || 'No description provided'}</p>
              </div>

              ${data.tags && data.tags.length > 0 ? `
              <div style="margin: 20px 0;">
                <strong style="color: #666;">Tags:</strong>
                <div style="margin-top: 8px;">
                  ${data.tags.map((tag: string) => `<span style="display: inline-block; background: #e9ecef; padding: 4px 12px; margin: 4px; border-radius: 12px; font-size: 13px;">${tag}</span>`).join('')}
                </div>
              </div>
              ` : ''}

              ${data.platforms && data.platforms.length > 0 ? `
              <div style="margin: 20px 0;">
                <strong style="color: #666;">Platforms:</strong>
                <div style="margin-top: 8px;">
                  ${data.platforms.map((platform: string) => `<span style="display: inline-block; background: #d1ecf1; padding: 4px 12px; margin: 4px; border-radius: 12px; font-size: 13px;">${platform}</span>`).join('')}
                </div>
              </div>
              ` : ''}

              ${data.supportedNetworks && data.supportedNetworks.length > 0 ? `
              <div style="margin: 20px 0;">
                <strong style="color: #666;">Supported Networks:</strong>
                <div style="margin-top: 8px;">
                  ${data.supportedNetworks.map((network: string) => `<span style="display: inline-block; background: #fff3cd; padding: 4px 12px; margin: 4px; border-radius: 12px; font-size: 13px;">${network}</span>`).join('')}
                </div>
              </div>
              ` : ''}

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #155724;">
                  <strong>⚡ Action Required:</strong> Review this submission in your Supabase dashboard and approve or reject it.
                </p>
              </div>

              <div style="text-align: center; margin: 25px 0;">
                <a href="https://cholo.app/apps"
                   style="display: inline-block; background: #ff006a; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  View All Apps
                </a>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p style="margin: 0;">This is an automated notification from CHOLO</p>
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
        subject: `CHOLO ownership claim: ${data.appName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 680px; margin: 0 auto; padding: 20px; background-color: #f6f7f9;">
            <div style="background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 22px;">Ownership Claim</h1>
              <p style="margin: 8px 0 0; color: #cbd5e1;">CHOLO app ownership verification request</p>
            </div>

            <div style="background: #ffffff; padding: 28px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
              <h2 style="margin-top: 0; color: #0f172a;">${appName}</h2>

              <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700; width: 170px;">App ID</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${appId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700;">CHOLO Page</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; word-break: break-all;">${appUrl}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700;">Website</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; word-break: break-all;">${websiteUrl}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700;">Claimant</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${claimantName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700;">Email</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${claimantEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 700;">Wallet / Address</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; word-break: break-all;">${walletAddress}</td>
                </tr>
              </table>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                <h3 style="margin: 0 0 8px; font-size: 16px;">Proof details</h3>
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
