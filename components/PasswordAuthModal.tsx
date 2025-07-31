'use client'
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { authenticateSession, SessionData } from '@/lib/session-utils';

interface PasswordAuthModalProps {
  sessionData: SessionData;
  onSuccess: () => void;
  onClose: () => void;
}

export default function PasswordAuthModal({ sessionData, onSuccess, onClose }: PasswordAuthModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError('');

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const isValid = authenticateSession(password, sessionData);
    
    if (isValid) {
      onSuccess();
    } else {
      setError('Invalid password. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="bg-[#111] border-[#222] p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-[#2563eb]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Enter Password</h2>
          <p className="text-gray-400">
            This wallet is password-protected. Enter your password to continue.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Wallet: {sessionData.address.slice(0, 8)}...{sessionData.address.slice(-8)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Enter your password"
                className="bg-[#181818] border-[#333] text-white pr-12"
                disabled={loading}
                autoFocus
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
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-400">
                <p className="font-semibold mb-1">Security Note:</p>
                <p className="text-xs">
                  This is the password you used when creating your email backup. 
                  It&apos;s different from your seed phrase.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
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
                  Authenticating...
                </span>
              ) : (
                'Unlock Wallet'
              )}
            </Button>
            
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="w-full border-[#333] text-gray-300 hover:bg-[#222]"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
