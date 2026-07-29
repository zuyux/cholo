'use client';



import { LocalizedText } from '@/components/LocalizedText';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams?.get('token');
    if (!token) {
      setStatus('error');
      setMessage("Verification token is missing.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/email/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        if (!response.ok) {
          setStatus('error');
          setMessage(data.error || 'Unable to verify email.');
          return;
        }

        setStatus('success');
        setMessage("Your email has been verified successfully. You can now return to BBOX.");
      } catch (error) {
        console.error('Verify email error:', error);
        setStatus('error');
        setMessage("Unexpected error verifying your email.");
      }
    };

    verifyEmail();
  }, [searchParams]);

  const icon = {
    loading: <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />,
    success: <CheckCircle className="w-12 h-12 text-green-400" />,
    error: <AlertTriangle className="w-12 h-12 text-red-400" />,
  }[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6">
        <div className="flex justify-center">{icon}</div>
        <h1 className="text-2xl font-semibold text-foreground">
          {status === 'success' && "Email Verified"}
          {status === 'error' && "Verification Failed"}
          {status === "loading" && "Verifying Email"}
        </h1>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex flex-col gap-3">
          <Button asChild className="cursor-pointer">
            <Link href="/"><LocalizedText>Return to BBOX</LocalizedText></Link>
          </Button>
          {status === 'error' && (
            <Button variant="outline" asChild className="cursor-pointer">
              <a href="mailto:fabohax@gmail.com"><LocalizedText>Contact Support</LocalizedText></a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
