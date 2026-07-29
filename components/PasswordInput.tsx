/**
 * Password Input Component for Encrypted Wallet Authentication
 * Provides secure password entry with strength validation and user feedback
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validatePassphraseStrength } from '@/lib/encryptedStorage';

interface PasswordInputProps {
  onSubmit: (password: string, email?: string, verifiedEmailToken?: string) => Promise<void>;
  mode: 'unlock' | 'create' | 'change';
  isLoading?: boolean;
  error?: string | null;
  placeholder?: string;
  showStrengthIndicator?: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  onSubmit,
  mode,
  isLoading = false,
  error = null,
  placeholder = 'Enter your password',
  showStrengthIndicator = false,
  autoFocus = true,
  onCancel
}) => {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeMessage, setEmailCodeMessage] = useState<string | null>(null);
  const [emailCodeError, setEmailCodeError] = useState<string | null>(null);
  const [emailCodeLoading, setEmailCodeLoading] = useState(false);
  const [verifiedEmailToken, setVerifiedEmailToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [strengthInfo, setStrengthInfo] = useState<{
    isValid: boolean;
    score: number;
    feedback: string[];
  } | null>(null);
  const [touched, setTouched] = useState(false);
  const isBusy = isLoading || emailCodeLoading;

  // Validate password strength in real-time for create/change modes
  useEffect(() => {
    if ((mode === 'create' || mode === 'change') && password && showStrengthIndicator) {
      const info = validatePassphraseStrength(password);
      setStrengthInfo(info);
    } else {
      setStrengthInfo(null);
    }
  }, [password, mode, showStrengthIndicator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) return;
    
    // Validate email for create mode
    if (mode === 'create' && !email.trim()) {
      return; // Email is required for account creation
    }
    
    // Validate email format for create mode
    if (mode === 'create' && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return; // Invalid email format
      }
    }

    if (mode === 'create' && !verifiedEmailToken) {
      setEmailCodeError('Verify your email before creating your wallet.');
      return;
    }
    
    // Validate strength for create/change modes
    if ((mode === 'create' || mode === 'change') && strengthInfo && !strengthInfo.isValid) {
      return; // Error will be shown by strength indicator
    }
    
    try {
      await onSubmit(
        password,
        mode === 'create' ? email : undefined,
        mode === 'create' ? verifiedEmailToken ?? undefined : undefined
      );
      // Clear form on success
      setPassword('');
      setEmail('');
      setEmailCode('');
      setEmailCodeSent(false);
      setEmailCodeMessage(null);
      setEmailCodeError(null);
      setVerifiedEmailToken(null);
      setTouched(false);
    } catch (error) {
      // Error will be displayed via props
      console.error('Password submission failed:', error);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailCode('');
    setEmailCodeSent(false);
    setEmailCodeMessage(null);
    setEmailCodeError(null);
    setVerifiedEmailToken(null);
  };

  const handleRequestEmailCode = async () => {
    const trimmedEmail = email.trim();
    setEmailCodeMessage(null);
    setEmailCodeError(null);
    setVerifiedEmailToken(null);

    if (!trimmedEmail) {
      setEmailCodeError('Email is required to create a wallet.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailCodeError('Enter a valid email address.');
      return;
    }

    try {
      setEmailCodeLoading(true);
      const response = await fetch('/api/auth/email-code/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send verification code');
      }

      setEmailCodeSent(true);
      setEmailCodeMessage('Verification code sent. Check your email.');
    } catch (requestError) {
      setEmailCodeError(requestError instanceof Error ? requestError.message : 'Failed to send verification code');
    } finally {
      setEmailCodeLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    const trimmedEmail = email.trim();
    const trimmedCode = emailCode.trim();
    setEmailCodeMessage(null);
    setEmailCodeError(null);

    if (!/^\d{6}$/.test(trimmedCode)) {
      setEmailCodeError('Enter the 6-digit verification code.');
      return;
    }

    try {
      setEmailCodeLoading(true);
      const response = await fetch('/api/auth/email-code/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, code: trimmedCode }),
      });
      const result = await response.json();

      if (!response.ok || !result.verifiedEmailToken) {
        throw new Error(result.error || 'Failed to verify code');
      }

      setVerifiedEmailToken(result.verifiedEmailToken);
      setEmailCodeMessage('Email verified. You can create your wallet now.');
    } catch (verifyError) {
      setVerifiedEmailToken(null);
      setEmailCodeError(verifyError instanceof Error ? verifyError.message : 'Failed to verify code');
    } finally {
      setEmailCodeLoading(false);
    }
  };

  const getStrengthColor = (score: number): string => {
    if (score <= 2) return 'bg-red-500';
    if (score <= 4) return 'bg-yellow-500';
    if (score <= 6) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number): string => {
    if (score <= 2) return 'Weak';
    if (score <= 4) return 'Fair';
    if (score <= 6) return 'Good';
    return 'Strong';
  };

  const emailValid = mode !== 'create' || (email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  const isFormValid = password.trim() &&
    emailValid &&
    (mode !== 'create' || Boolean(verifiedEmailToken)) &&
    (!strengthInfo || strengthInfo.isValid);

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input - Only for create mode */}
        {mode === 'create' && (
          <div className="space-y-2">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="Enter your email address"
              className="bg-background text-foreground focus:border-ring border-[1px] border-foreground/10 py-6"
              disabled={isBusy || Boolean(verifiedEmailToken)}
              autoComplete="off"
              autoFocus
              required
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleRequestEmailCode}
                disabled={!emailValid || isBusy || Boolean(verifiedEmailToken)}
                className="flex-1 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailCodeSent ? 'Resend Code' : 'Send Code'}
              </Button>
              {emailCodeSent && (
                <Button
                  type="button"
                  onClick={() => {
                    setEmail('');
                    setEmailCode('');
                    setEmailCodeSent(false);
                    setEmailCodeMessage(null);
                    setEmailCodeError(null);
                    setVerifiedEmailToken(null);
                  }}
                  disabled={isBusy}
                  className="bg-transparent text-muted-foreground border border-border hover:bg-secondary"
                >
                  Change
                </Button>
              )}
            </div>
            {emailCodeSent && (
              <div className="flex gap-2">
                <Input
                  id="email-code"
                  type="text"
                  inputMode="numeric"
                  value={emailCode}
                  onChange={(e) => {
                    setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setVerifiedEmailToken(null);
                    setEmailCodeError(null);
                  }}
                  placeholder="6-digit code"
                  className="bg-background text-foreground focus:border-ring border-[1px] border-foreground/10 py-6"
                  disabled={isBusy || Boolean(verifiedEmailToken)}
                  autoComplete="one-time-code"
                />
                <Button
                  type="button"
                  onClick={handleVerifyEmailCode}
                  disabled={emailCode.length !== 6 || isBusy || Boolean(verifiedEmailToken)}
                  className="text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify
                </Button>
              </div>
            )}
            {(emailCodeMessage || emailCodeError) && (
              <p className={`text-xs ${emailCodeError ? 'text-red-400' : 'text-green-400'}`}>
                {emailCodeError || emailCodeMessage}
              </p>
            )}
          </div>
        )}

        {/* Main Password Input */}
        <div className="space-y-2">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (!touched) setTouched(true);
              }}
              placeholder={placeholder}
              className="bg-background text-foreground pr-12 focus:border-ring border-[1px] border-foreground/10 py-6"
              autoFocus={mode !== 'create' && autoFocus}
              disabled={isBusy}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
              tabIndex={-1}
              disabled={isBusy}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Strength Indicator */}
        {showStrengthIndicator && strengthInfo && touched && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Password Strength:</span>
              <span className={`font-medium ${strengthInfo.isValid ? 'text-green-400' : 'text-red-400'}`}>
                {getStrengthText(strengthInfo.score)}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strengthInfo.score)}`}
                style={{ width: `${(strengthInfo.score / 7) * 100}%` }}
              />
            </div>
            {strengthInfo.feedback.length > 0 && (
              <div className="space-y-1">
                {strengthInfo.feedback.map((feedback, index) => (
                  <p key={index} className="text-yellow-400 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {feedback}
                  </p>
                ))}
              </div>
            )}
            {strengthInfo.isValid && (
              <p className="text-green-400 text-xs flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                The password meets the security requirements
              </p>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={!isFormValid || isBusy}
            className="flex-1 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isBusy ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {emailCodeLoading ? 'Checking...' :
                 mode === 'unlock' ? 'Unlocking...' :
                 mode === 'create' ? 'Creating...' : 'Updating...'}
              </div>
            ) : (
              <>
                {mode === 'unlock' ? 'Unlock Wallet' : 
                 mode === 'create' ? 'Create Wallet' : 'Change Password'}
              </>
            )}
          </Button>
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              disabled={isBusy}
              className="bg-transparent text-muted-foreground border border-border hover:bg-secondary"
            >
              Cancel
            </Button>
          )}
          
        </div>
      </form>
    </div>
  );
};

export default PasswordInput;
