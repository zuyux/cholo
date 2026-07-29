'use client';



import { LocalizedText } from '@/components/LocalizedText';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldX, CheckCircle, Loader2 } from 'lucide-react';

export default function RemoveEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your request...');

  useEffect(() => {
    const token = searchParams?.get('token');
    if (!token) {
      setStatus('error');
      setMessage("Removal token is missing.");
      return;
    }

    const removeEmail = async () => {
      try {
        const response = await fetch('/api/email/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        if (!response.ok) {
          setStatus('error');
          setMessage(data.error || 'Unable to remove this email.');
          return;
        }

        setStatus('success');
        setMessage("This email has been removed from the wallet. You can now register it elsewhere.");
      } catch (error) {
        console.error('Remove email error:', error);
        setStatus('error');
        setMessage("Unexpected error removing your email.");
      }
    };

    removeEmail();
  }, [searchParams]);

  const icon = {
    loading: <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />,
    success: <CheckCircle className="w-12 h-12 text-green-400" />,
    error: <ShieldX className="w-12 h-12 text-red-400" />,
  }[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6">
        <div className="flex justify-center">{icon}</div>
        <h1 className="text-2xl font-semibold text-foreground">
          {status === 'success' && "Email Removed"}
          {status === 'error' && "Removal Failed"}
          {status === "loading" && "Removing Email"}
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
