import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    console.log('Test email API called');
    
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    console.log('Sending test email to:', email);
    console.log('Using API key:', process.env.RESEND_API_KEY ? `configured (${process.env.RESEND_API_KEY.substring(0, 10)}...)` : 'missing');
    console.log('From email:', process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev');

    // Send simple test email
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [email],
      subject: 'Kapu Wallet - Test Email',
      html: `
        <h1>Test Email from Kapu Wallet</h1>
        <p>This is a test email to verify the email configuration is working correctly.</p>
        <p>If you received this email, the Resend integration is working!</p>
      `,
    });

    if (error) {
      console.error('Email sending error details:', {
        message: error.message,
        name: error.name,
        fullError: JSON.stringify(error, null, 2)
      });
      return NextResponse.json(
        { error: 'Failed to send test email', details: error },
        { status: 500 }
      );
    }

    console.log('Test email sent successfully:', data?.id);
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      emailId: data?.id
    });

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
