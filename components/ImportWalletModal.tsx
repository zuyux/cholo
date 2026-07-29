'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  validateAndGenerateWallet,
  validateAndGenerateWalletFromPrivateKeyMnemonic,
} from '@/lib/walletHelpers';
import CryptoJS from 'crypto-js';
import { signMessageHashRsv } from '@stacks/transactions';
import {
  createPortableEncryptedWalletData,
  validatePassphraseStrength,
  type WalletData,
} from '@/lib/encryptedStorage';
import { useI18n } from '@/components/I18nProvider';

interface ImportWalletModalProps {
  onBack: () => void;
  onImported: (wallet: WalletData, password: string) => Promise<void>;
}

export default function ImportWalletModal({ onBack, onImported }: ImportWalletModalProps) {
  const { translate } = useI18n();
  const [phraseLength, setPhraseLength] = useState<12 | 24>(12);
  const [words, setWords] = useState(() => Array(12).fill(''));
  const [step, setStep] = useState<'phrase' | 'password'>('phrase');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const passwordStrength = useMemo(() => validatePassphraseStrength(password), [password]);

  const updateWord = (index: number, value: string) => {
    const pastedWords = value.trim().split(/\s+/).filter(Boolean);
    if (index === 0 && (pastedWords.length === 12 || pastedWords.length === 24)) {
      const nextLength = pastedWords.length as 12 | 24;
      setPhraseLength(nextLength);
      setWords(pastedWords.map((word) => word.toLowerCase()));
      setError('');
      inputRefs.current[nextLength - 1]?.focus();
      return;
    }
    setWords((current) => {
      const next = [...current];
      if (pastedWords.length > 1) {
        pastedWords.slice(0, phraseLength - index).forEach((word, offset) => {
          next[index + offset] = word.toLowerCase();
        });
      } else {
        next[index] = value.replace(/\s/g, '').toLowerCase();
      }
      return next;
    });
    if (pastedWords.length > 1) {
      inputRefs.current[Math.min(index + pastedWords.length, phraseLength - 1)]?.focus();
    }
  };

  const changePhraseLength = (nextLength: 12 | 24) => {
    setPhraseLength(nextLength);
    setWords((current) => Array.from({ length: nextLength }, (_, index) => current[index] || ''));
    setError('');
  };

  const checkPhrase = async () => {
    setError('');
    if (words.some((word) => !word.trim())) {
      setError(translate('Enter all {count} recovery words in the correct order.', { count: phraseLength }));
      return;
    }
    try {
      setBusy(true);
      const phrase = words.join(' ');
      const candidates = [await validateAndGenerateWallet(phrase)];
      if (phraseLength === 24) {
        candidates.push(validateAndGenerateWalletFromPrivateKeyMnemonic(phrase));
      }

      for (const derived of candidates) {
        const response = await fetch('/api/wallet/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check',
            address: derived.address,
            bitcoinAddress: derived.bitcoinAddress,
            rootstockAddress: derived.rootstockAddress,
            liquidAddress: derived.liquidAddress,
          }),
        });
        const result = await response.json();
        if (response.ok && result.exists) {
          setWallet({ ...derived, label: result.walletLabel || 'BBOX Wallet' });
          setStep('password');
          return;
        }
      }

      throw new Error(translate('No BBOX account was found for this recovery phrase.'));
    } catch (cause) {
      setError(cause instanceof Error && cause.message !== 'Invalid mnemonic'
        ? cause.message
        : translate('That recovery phrase is not valid. Check the words and their order.'));
    } finally {
      setBusy(false);
    }
  };

  const finishImport = async () => {
    if (!wallet) return;
    setError('');
    if (!passwordStrength.isValid) {
      setError(translate('Choose a stronger password that meets the requirements below.'));
      return;
    }
    if (password !== confirmPassword) {
      setError(translate('Passwords do not match.'));
      return;
    }
    try {
      setBusy(true);
      const encryptedWallet = createPortableEncryptedWalletData(wallet, password);
      const passkey = CryptoJS.SHA256(wallet.privateKey + password).toString();
      const proofPayload = JSON.stringify({
        address: wallet.address,
        passkey,
        encryptedMnemonic: encryptedWallet.encryptedMnemonic,
        encryptedPrivateKey: encryptedWallet.encryptedPrivateKey,
        salt: encryptedWallet.salt,
        iv: encryptedWallet.iv,
      });
      const messageHash = CryptoJS.SHA256(proofPayload).toString();
      const signature = signMessageHashRsv({ messageHash, privateKey: wallet.privateKey });
      const response = await fetch('/api/wallet/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recover',
          address: wallet.address,
          bitcoinAddress: wallet.bitcoinAddress,
          rootstockAddress: wallet.rootstockAddress,
          liquidAddress: wallet.liquidAddress,
          passkey,
          signature,
          encryptedWallet,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || translate('Unable to import wallet.'));
      await onImported(wallet, password);
    } catch (cause) {
      setError(cause instanceof Error ? translate(cause.message) : translate('Unable to import wallet.'));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 text-foreground">
      <button type="button" onClick={step === 'phrase' ? onBack : () => { setStep('phrase'); setError(''); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {translate('Back')}
      </button>

      {step === 'phrase' ? (
        <>
          <p className="text-sm text-muted-foreground">{translate('Choose your phrase length, then enter the recovery words in order. You can paste the entire phrase into the first field.')}</p>
          <div className="grid grid-cols-2 rounded-lg border border-border p-1" role="group" aria-label={translate('Recovery phrase length')}>
            {([12, 24] as const).map((length) => (
              <button
                key={length}
                type="button"
                onClick={() => changePhraseLength(length)}
                aria-pressed={phraseLength === length}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  phraseLength === length
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {translate('{count} words', { count: length })}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {words.map((word, index) => (
              <label key={index} className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{index + 1}</span>
                <Input
                  ref={(node) => { inputRefs.current[index] = node; }}
                  value={word}
                  onChange={(event) => updateWord(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === ' ' && word && index < phraseLength - 1) inputRefs.current[index + 1]?.focus();
                    if (event.key === 'Backspace' && !word && index > 0) inputRefs.current[index - 1]?.focus();
                  }}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="pl-8"
                  aria-label={translate('Recovery word {count}', { count: index + 1 })}
                />
              </label>
            ))}
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">{translate('Never share this phrase. BBOX support will never ask for it.')}</div>
          <Button className="w-full" disabled={busy || words.some((word) => !word)} onClick={checkPhrase}>{translate(busy ? 'Checking account…' : 'Continue')}</Button>
        </>
      ) : (
        <>
          <div className="flex gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 text-green-600" />
            <div><div className="font-medium">{translate('Account found')}</div><div className="text-xs text-muted-foreground break-all">{wallet?.address}</div></div>
          </div>
          <p className="text-sm text-muted-foreground">{translate('Set a new password to encrypt this wallet on this device and sign in.')}</p>
          <div className="relative">
            <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={translate('New password')} autoComplete="new-password" className="pr-10" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={translate(showPassword ? 'Hide password' : 'Show password')}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
          <Input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={translate('Confirm new password')} autoComplete="new-password" />
          {password && <p className="text-xs text-muted-foreground">{passwordStrength.feedback.length ? passwordStrength.feedback.map((message) => translate(message)).join(' · ') : translate('Password meets the security requirements.')}</p>}
          <Button className="w-full" disabled={busy || !password || !confirmPassword} onClick={finishImport}>{translate(busy ? 'Importing wallet…' : 'Set Password & Sign In')}</Button>
        </>
      )}
      {error && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>}
    </div>
  );
}
