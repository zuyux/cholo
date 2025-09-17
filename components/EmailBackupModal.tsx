'use client'
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Mail, Eye, EyeOff, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { LoaderCircle } from 'lucide-react';

interface EmailBackupModalProps {
  walletData: {
    stxPrivateKey: string;
    address: string;
    mnemonic: string;
  };
  onClose: () => void;
  onSuccess?: (password: string) => void;
}

export default function EmailBackupModal({ walletData, onClose, onSuccess }: EmailBackupModalProps) {
  const [step, setStep] = useState<'form' | 'sending' | 'success' | 'error'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = () => {
    const newErrors: string[] = [];
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.push('Email is required');
    } else if (!emailRegex.test(email)) {
      newErrors.push('Please enter a valid email address');
    }
    
    // Password validation
    if (!password) {
      newErrors.push('Password is required');
    } else {
      if (password.length < 12) {
        newErrors.push('Password must be at least 12 characters long');
      }
      if (!/[A-Z]/.test(password)) {
        newErrors.push('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        newErrors.push('Password must contain at least one lowercase letter');
      }
      if (!/[0-9]/.test(password)) {
        newErrors.push('Password must contain at least one number');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        newErrors.push('Password must contain at least one special character');
      }
    }
    
    // Confirm password validation
    if (password !== confirmPassword) {
      newErrors.push('Passwords do not match');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setStep('sending');
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/send-encrypted-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          walletData
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStep('success');
        onSuccess?.(password);
      } else {
        setStep('error');
        setErrorMessage(data.error || 'Failed to send backup email');
      }
    } catch {
      setStep('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'sending':
        return (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <LoaderCircle className="animate-spin text-primary" size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Sending Encrypted Backup</h3>
            <p className="text-gray-400">Encrypting your wallet and sending it to your email...</p>
          </div>
        );
        
      case 'success':
        return (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Backup Sent Successfully!</h3>
            <p className="text-gray-400 mb-6">
              We&apos;ve sent an encrypted backup of your wallet to <strong className="text-white">{email}</strong>
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-400">
                  <p className="font-semibold mb-1">Next Steps:</p>
                  <ul className="space-y-1 text-xs text-left">
                    <li>• Check your email for the recovery link</li>
                    <li>• Keep your password safe - we cannot recover it</li>
                    <li>• You can use the link to restore your wallet anytime</li>
                    <li>• Save the recovery link securely for future use</li>
                  </ul>
                </div>
              </div>
            </div>
            <Button
              onClick={onClose}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            >
              Continue
            </Button>
          </div>
        );
        
      case 'error':
        return (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Backup Failed</h3>
            <p className="text-gray-400 mb-6">{errorMessage}</p>
            <div className="space-y-3">
              <Button
                onClick={() => setStep('form')}
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              >
                Try Again
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full border-[#333] text-gray-300 hover:bg-[#222]"
              >
                Skip Backup
              </Button>
            </div>
          </div>
        );
        
      default:
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="bg-[#181818] border-[#333] text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Backup Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password (min 12 chars)"
                  className="bg-[#181818] border-[#333] text-white pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="bg-[#181818] border-[#333] text-white pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    {errors.map((error, index) => (
                      <p key={index} className="text-red-400 text-sm">{error}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-400">
                  <p className="font-semibold mb-1">Security Features:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Your wallet is encrypted with your password</li>
                    <li>• Recovery link does not expire</li>
                    <li>• Password cannot be recovered - keep it safe</li>
                    <li>• Email backup is optional but recommended</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold py-3 cursor-pointer"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Encrypted Backup
              </Button>
              
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="w-full border-[#333] text-gray-300 hover:bg-[#222] cursor-pointer"
              >
                Skip
              </Button>
            </div>
          </form>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="bg-[#111] border-[#222] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Mail className="w-12 h-12 text-[#2563eb]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Email Backup</h2>
          <p className="text-gray-400">
            Create an encrypted backup of your wallet that can be recovered via email
          </p>
        </div>

        {renderStep()}
      </Card>
    </div>
  );
}
