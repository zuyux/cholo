import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '@/lib/email';
import crypto from 'crypto';

// In-memory token storage (in production, use a database)
// Store tokens that represent private key hashes for email-based connections
const connectionTokens = new Map<string, {
  email: string;
  privateKeyHash: string;
  createdAt: number;
  expiresAt: number;
}>();

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of connectionTokens.entries()) {
    if (now > data.expiresAt) {
      connectionTokens.delete(token);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    console.log('📧 Email connection request for:', email);

    if (!email || typeof email !== 'string') {
      console.log('❌ Email validation failed: missing or invalid email');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Email validation failed: invalid format', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email service is configured
    console.log('📬 Attempting to send connection email to:', email);

    // Generate secure token that represents a private key hash
    // In a real implementation, this would be derived from the user's private key
    const token = crypto.randomBytes(32).toString('hex');
    const privateKeyHash = crypto.createHash('sha256').update(email + token).digest('hex');
    const now = Date.now();
    const expiresAt = now + (30 * 60 * 1000); // 30 minutes expiry

    // Store connection token
    connectionTokens.set(token, {
      email,
      privateKeyHash,
      createdAt: now,
      expiresAt
    });

    console.log('🔑 Generated connection token for:', email, 'expires in 30min');

    // Create connection URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const connectionUrl = `${baseUrl}/wallet-connect?token=${token}`;

    console.log('🔗 Connection URL created:', connectionUrl);

    // Send email using Resend
    try {
      console.log('� Sending connection email...');
      const emailTemplate = emailTemplates.walletConnectionLink(connectionUrl);
      
      await sendEmail({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });
      
      console.log('✅ Connection email sent successfully');
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      
      return NextResponse.json(
        { error: 'Failed to send connection email. Please check the server logs for details.' },
        { status: 500 }
      );
    }

    console.log('🎉 Connection email sent successfully to:', email);
    return NextResponse.json({
      success: true,
      message: 'Connection link sent successfully'
    });

  } catch (error) {
    console.error('❌ Email connection error:', error);
    return NextResponse.json(
      { error: 'Failed to send connection email' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // For development/testing: accept any 64-character hex token
    if (process.env.NODE_ENV === 'development' && token.length === 64 && /^[a-f0-9]+$/i.test(token)) {
      return NextResponse.json({
        valid: true,
        email: 'test@example.com',
        privateKeyHash: 'development_hash',
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes from now
      });
    }

    const tokenData = connectionTokens.get(token);
    
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    if (Date.now() > tokenData.expiresAt) {
      connectionTokens.delete(token);
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: tokenData.email,
      privateKeyHash: tokenData.privateKeyHash,
      expiresAt: tokenData.expiresAt
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}
