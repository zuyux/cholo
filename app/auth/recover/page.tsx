'use client'
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';

export default function RecoverWalletPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid recovery link');
      setTokenValid(false);
      return;
    }
    
    // Validate token on page load
    const validateToken = async () => {
      try {
        const response = await fetch('/api/validate-recovery-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          setTokenValid(true);
        } else {
          const data = await response.json();
          setError(data.error || 'Invalid recovery link');
          setTokenValid(false);
        }
      } catch {
        setError('Failed to validate recovery link');
        setTokenValid(false);
      }
    };
    
    validateToken();
  }, [token]);

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/recover-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store wallet data in localStorage
        localStorage.setItem('kapu_session', JSON.stringify({
          stxPrivateKey: data.wallet.stxPrivateKey,
          address: data.wallet.address,
          createdAt: Date.now(),
        }));

        // Dispatch event to update other components
        window.dispatchEvent(new Event('kapu-session-update'));

        // Redirect to wallet page
        router.push('/wallet');
      } else {
        setError(data.error || 'Failed to recover wallet');
      }
    } catch {
      setError('Failed to recover wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="flex items-center justify-center w-full mb-4">
          <Image
            src="/loader.gif"
            alt="Loading..."
            width={75}
            height={37.5}
            style={{ minWidth: 75, minHeight: 37.5, width: 75, height: 37.5 }}
          />
        </div>
        <p className="text-gray-400">Validating recovery link...</p>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <Card className="bg-[#111] border-[#222] p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Recovery Link</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button
            onClick={() => router.push('/')}
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          >
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Card className="bg-[#111] border-[#222] p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-[#2563eb]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Recover Your Wallet</h2>
          <p className="text-gray-400">Enter your password to decrypt and access your wallet</p>
        </div>

        <form onSubmit={handleRecover} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password (min 12 characters)"
                className="bg-[#181818] border-[#333] text-white pr-12"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-400">
                <p className="font-semibold mb-1">Security Notice:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Your password cannot be recovered if forgotten</li>
                  <li>• Keep your password secure and private</li>
                  <li>• This link can be used multiple times until you recover</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold py-3"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Image
                  src="/loader.gif"
                  alt="Loading..."
                  width={20}
                  height={10}
                  style={{ minWidth: 20, minHeight: 10, width: 20, height: 10 }}
                />
                Decrypting Wallet...
              </span>
            ) : (
              'Recover Wallet'
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
