import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { encryptWalletData, validatePassword } from '@/lib/encryption';
import { encryptedWallets } from '@/lib/wallet-storage';
import CryptoJS from 'crypto-js';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    console.log('Send encrypted wallet API called');
    
    const { email, password, walletData } = await request.json();
    console.log('Received data:', { email, hasPassword: !!password, hasWalletData: !!walletData });

    // Validate required fields
    if (!email || !password || !walletData) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Email, password, and wallet data are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format');
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      console.log('Password validation failed:', passwordValidation.errors);
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Validate wallet data structure
    if (!walletData.stxPrivateKey || !walletData.address || !walletData.mnemonic) {
      console.log('Invalid wallet data structure');
      return NextResponse.json(
        { error: 'Invalid wallet data structure' },
        { status: 400 }
      );
    }

    console.log('Encrypting wallet data...');
    // Encrypt only the private key and mnemonic with password
    const encryptedWallet = encryptWalletData(walletData, password);
    
    // Use hashed private key as the recovery token
    const token = CryptoJS.SHA256(walletData.stxPrivateKey).toString();
    
    // Store encrypted wallet with token (temporary storage for recovery)
    encryptedWallets.set(token, encryptedWallet);
    console.log('Wallet encrypted and stored with token (hashed private key)');

    // Create recovery link - detect the current port dynamically
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.NEXT_PUBLIC_BASE_URL || 
                 process.env.VERCEL_URL || 
                 `localhost:${process.env.PORT || '3002'}`;
    const baseUrl = host.startsWith('http') ? host : `${protocol}://${host}`;
    const recoveryLink = `${baseUrl}/auth/recover?token=${token}`;
    console.log('Recovery link created:', recoveryLink);

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    console.log('Sending email via Resend...');
    console.log('From email:', process.env.RESEND_FROM_EMAIL);
    console.log('To email:', email);
    console.log('API Key length:', process.env.RESEND_API_KEY?.length);
    
    // For Resend testing mode, emails can only be sent to the account owner's email
    // In production with verified domain, this restriction is removed
    const testingMode = process.env.RESEND_TESTING_MODE === 'true';
    const toEmail = testingMode ? 'fabohax@gmail.com' : email;
    
    if (testingMode && email !== 'fabohax@gmail.com') {
      console.log(`Testing mode: redirecting email from ${email} to fabohax@gmail.com`);
    }
    
    // Send email with recovery link
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [toEmail],
      subject: `Kapu Wallet Recovery Link${testingMode && email !== toEmail ? ` (for ${email})` : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Kapu Wallet Recovery</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Kapu Wallet</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Secure Wallet Recovery</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #2563eb; margin-top: 0;">Your Encrypted Wallet is Ready</h2>
            
            ${testingMode && email !== toEmail ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Testing Mode:</strong> This email was originally intended for ${email} but redirected to the account owner for testing purposes.
              </p>
            </div>
            ` : ''}
            
            <p>Your Kapu wallet has been securely encrypted and is ready for recovery. Click the button below to access your wallet:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${recoveryLink}" 
                 style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                🔓 Recover My Wallet
              </a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0; font-size: 16px;">⚠️ Important Security Information:</h3>
              <ul style="color: #856404; margin: 0; padding-left: 20px;">
                <li>You will need your password to decrypt your wallet</li>
                <li>Never share this link or your password with anyone</li>
                <li>Kapu cannot recover your password - keep it safe</li>
                <li>Save this link securely for future wallet recovery</li>
              </ul>
            </div>
            
            <p style="margin-bottom: 0;">If you didn't request this wallet recovery, please ignore this email.</p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2025 Kapu Wallet - Open source software licensed under GNU License</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Email sending error details:', {
        message: error.message,
        name: error.name,
        fullError: JSON.stringify(error, null, 2)
      });
      return NextResponse.json(
        { error: 'Failed to send recovery email', details: error.message },
        { status: 500 }
      );
    }

    console.log('Email sent successfully:', data?.id);
    return NextResponse.json({
      success: true,
      message: 'Recovery email sent successfully',
      emailId: data?.id
    });

  } catch (error) {
    console.error('Send wallet email error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
