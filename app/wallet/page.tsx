"use client";


import { LocalizedText } from "@/components/LocalizedText";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getStoredEncryptedWallet, retrieveEncryptedWallet, updateEncryptedWalletAddresses, type WalletData } from "@/lib/encryptedStorage";
import { getBitcoinAddressFromPrivateKey } from "@/lib/bitcoinWallet";
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { PasswordSigningModal } from "@/components/PasswordSigningModal";
import { PasswordInput } from "@/components/PasswordInput";
import { useEncryptedWallet } from "@/components/EncryptedWalletProvider";
import { request as satsRequest } from 'sats-connect';
import { persistCachedWalletState, useWallet } from "@/components/WalletProvider";
import { sendBitcoinWithKey } from "@/lib/bitcoinTransfer";
import { fetchBitcoinBalance, type NativeBalance } from "@/lib/nativeBalances";
import { createStacksAccount } from "@/lib/stacksWallet";

const STACKS_ADDRESS_REGEX = /^(SP|SM|SN|ST|SU|TP|TM|TN|TS)[A-Za-z0-9]{30,40}$/i;
const BITCOIN_MAINNET_ADDRESS_REGEX = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/i;
const BITCOIN_TESTNET_ADDRESS_REGEX = /^(tb1|[mn2])[a-zA-HJ-NP-Z0-9]{25,90}$/i;
const MAX_MEMO_BYTES = 34;
const SATS_PER_BTC = 100_000_000;

type ReceiveLayer = 'bitcoin';
type ReceiveAsset = ReceiveLayer | 'stacks';
type SendAsset = 'bitcoin' | 'sbtc';
type ReceiveAddressPayload = {
  address: string;
  bitcoinAddress?: string;
};
type LightningBalanceState = {
  display: string;
  status: 'idle' | 'loading' | 'available' | 'unavailable';
};
type BalanceCapableWebLN = {
  enable?: () => Promise<void>;
  getBalance?: () => Promise<{ balance?: number; currency?: string }>;
};

const RECEIVE_LAYER_LABELS: Record<ReceiveLayer, string> = {
  bitcoin: 'Bitcoin',
};

async function saveReceiveAddressesToSupabase(payload: ReceiveAddressPayload) {
  const response = await fetch('/api/wallet/addresses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.details || body?.error || 'Failed to save receive addresses to Supabase');
  }
}

const RECEIVE_ASSET_LABELS: Record<ReceiveAsset, string> = {
  bitcoin: 'Bitcoin L1',
  stacks: 'Stacks',
};

const SEND_ASSETS: Array<{
  id: SendAsset;
  label: string;
  networkLabel: string;
  unit: string;
  placeholder: string;
  recipientHint: string;
  supported: boolean;
  requiresExtension?: boolean;
}> = [
  {
    id: 'bitcoin',
    label: 'BTC',
    networkLabel: 'Bitcoin',
    unit: 'BTC',
    placeholder: 'bc1...',
    recipientHint: 'Use a Bitcoin L1 address.',
    supported: true,
    requiresExtension: true,
  },
  {
    id: 'sbtc',
    label: 'Stacks Network',
    networkLabel: 'Stacks',
    unit: 'sBTC',
    placeholder: 'SP3FBR2K...',
    recipientHint: 'Use a Stacks address for sBTC on Stacks.',
    supported: true,
  },
];

const FEATURED_TOKEN_CONTRACTS = new Set([
  'SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD::cholo',
]);

const FEATURED_TOKEN_SYMBOLS = new Set([
  'cholo',
]);

const formatQuickFillAmount = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }
  const normalized = value >= 1 ? Number(value.toFixed(6)) : Number(value.toPrecision(6));
  return normalized.toString();
};

const formatCompactBalance = (value: number) => {
  if (!Number.isFinite(value)) {
    return '--';
  }
  return value >= 1
    ? value.toLocaleString(undefined, { maximumFractionDigits: 6 })
    : value.toPrecision(4);
};

const EMPTY_NATIVE_BALANCE: NativeBalance = {
  value: null,
  display: '--',
};

const ZERO_BTC_NATIVE_BALANCE: NativeBalance = {
  value: 0,
  display: '0.00 BTC',
};

const BALANCE_FETCH_TIMEOUT_MS = 2500;
const OKX_ACCOUNTS_TIMEOUT_MS = 1200;

const formatAssetCardBalance = (balance: NativeBalance) => {
  if (balance.display === 'Loading...') return balance.display;
  if (balance.value === null) return '--';
  if (balance.value === 0) return '0.00';
  return balance.value >= 1
    ? balance.value.toLocaleString(undefined, { maximumFractionDigits: 8 })
    : balance.value.toLocaleString(undefined, { maximumFractionDigits: 8, minimumFractionDigits: 1 });
};

const formatStacksAssetCardBalance = (value: string | undefined) => {
  const parsed = Number(String(value ?? '0').replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed === 0) return '0.00';
  return parsed >= 1
    ? parsed.toLocaleString(undefined, { maximumFractionDigits: 6, minimumFractionDigits: 2 })
    : parsed.toLocaleString(undefined, { maximumFractionDigits: 6, minimumFractionDigits: 2 });
};

function BalanceDisplay({
  loading,
  unavailable,
  onRefresh,
  refreshLabel = 'Refresh balance',
  children,
  className = 'text-lg font-semibold',
}: {
  loading: boolean;
  unavailable?: boolean;
  onRefresh?: () => void;
  refreshLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex min-h-[1.5em] items-center justify-end ${className}`}>
      {loading ? (
        <LoaderCircle className="animate-spin text-foreground" size={18} />
      ) : unavailable && onRefresh ? (
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-transparent text-foreground transition hover:bg-muted"
          onClick={(event) => {
            event.stopPropagation();
            onRefresh();
          }}
          aria-label={refreshLabel}
          title={refreshLabel}
        >
          <RefreshCw size={14} />
        </button>
      ) : (
        children
      )}
    </span>
  );
}

function CreatePasskeyAddressModal({
  isOpen,
  title,
  description,
  error,
  isLoading,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (password: string, email?: string, verifiedEmailToken?: string) => Promise<void>;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-md rounded-lg border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-black">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10 dark:bg-white/10">
              <Wallet className="h-5 w-5 text-black dark:text-white" />
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-md text-black hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-6 text-sm text-black/70 dark:text-white/70">{description}</p>
        <PasswordInput
          mode="create"
          onSubmit={onSubmit}
          isLoading={isLoading}
          error={error}
          placeholder={"Create a wallet password"}
          showStrengthIndicator
          onCancel={onClose}
        />
        <div className="mt-4 text-center text-xs text-black/50 dark:text-white/50">
          <LocalizedText>Your password encrypts the new wallet locally and is never sent to our servers.
        </LocalizedText></div>
      </div>
    </div>
  );
}

const isValidBitcoinAddress = (value: string, network: 'mainnet' | 'testnet' | 'devnet') => {
  const normalized = value.trim();
  if (!normalized) return false;
  return network === 'mainnet'
    ? BITCOIN_MAINNET_ADDRESS_REGEX.test(normalized)
    : BITCOIN_TESTNET_ADDRESS_REGEX.test(normalized);
};

const btcToSats = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(trimmed)) {
    return null;
  }
  const [whole, fraction = ''] = trimmed.split('.');
  const wholeSats = BigInt(whole) * BigInt(SATS_PER_BTC);
  const fractionalSats = BigInt(fraction.padEnd(8, '0'));
  const total = wholeSats + fractionalSats;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }
  return Number(total);
};

const abbreviateAddress = (value: string, chars = 5) => {
  if (!value) {
    return '';
  }
  if (value.length <= chars * 2 + 3) {
    return value;
  }
  return `${value.slice(0, chars)}...${value.slice(-chars)}`;
};

const abbreviateMiddle = (value: string, start = 6, end = 4) => {
  if (!value) return '';
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
};

const formatLightningBalance = (balance: number, currency?: string) => {
  const normalizedCurrency = (currency || 'sats').toLowerCase();
  const sats = normalizedCurrency === 'msat' || normalizedCurrency === 'msats'
    ? balance / 1000
    : balance;

  if (!Number.isFinite(sats)) {
    return '--';
  }

  return `${sats.toLocaleString(undefined, { maximumFractionDigits: 0 })} sats`;
};

class TimeoutError extends Error {
  constructor() {
    super('Request timed out');
    this.name = 'TimeoutError';
  }
}

const isTimeoutError = (error: unknown) => error instanceof TimeoutError;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new TimeoutError()), timeoutMs);
    }),
  ]);
};

const createTimedAbortController = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
};

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (error) {
    console.warn('Clipboard API copy failed, trying fallback:', error);
  }

  try {
    if (typeof document === 'undefined') return false;

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch (error) {
    console.warn('Fallback copy failed:', error);
    return false;
  }
}

// Extend the Window interface to include StacksProvider and Xverse provider helpers
declare global {
  interface Window {
    LeatherProvider?: unknown;
  }
}

import { getApiUrl } from "@/lib/stacks-api";
import { getPersistedNetwork, inferNetworkFromAddress, persistNetwork, type Network } from "@/lib/network";
import { getSBTCContract } from "@/lib/contracts";
import { getWalletErrorMessage, isWalletRequestCancelled } from '@/lib/walletErrors';
import { sendSbtcDonation, sendSbtcDonationWithKey } from "@/lib/cholo-contract";

import { Copy, X, LoaderCircle, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { fetchRecentTransactions } from "@/lib/fetchRecentTransactions";
import Image from "next/image";
import { getProfile } from "@/lib/profileApi";
import { getOkxBitcoinAccounts, type OkxBitcoinAccount } from "@/lib/okxWallet";
import { BitflowSwapPanel } from "@/features/swaps/components/BitflowSwapPanel";
import HomePage from "../page";

export default function WalletPage() {
  const router = useRouter();
  const address = useCurrentAddress() || "";
  const { walletType, setAddress, setWalletType } = useWallet();
  const { createEncryptedWallet } = useEncryptedWallet();
  const isNostrLightningAccount = walletType === 'alby' || walletType === 'nostria' || address.startsWith('npub');
  const isOkxBitcoinAccount = walletType === 'okx';
  const isBitcoinOnlyAccount = walletType === 'okx';
  const [sbtcBalance, setSbtcBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightningBalance, setLightningBalance] = useState<LightningBalanceState>({
    display: '--',
    status: 'idle',
  });
  const [profileLightningAddress, setProfileLightningAddress] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<Network>(() => getPersistedNetwork());
  const sbtcContractId = useMemo(() => getSBTCContract(currentNetwork), [currentNetwork]);

  type WalletAsset = {
    id: string;
    name: string;
    symbol: string;
    formattedBalance: string;
    rawBalance: string;
    type: 'stx' | 'fungible';
  };

  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [btcAddressLoading, setBtcAddressLoading] = useState(false);
  const [btcAddressError, setBtcAddressError] = useState<string | null>(null);
  const [okxBitcoinAccounts, setOkxBitcoinAccounts] = useState<OkxBitcoinAccount[]>([]);
  const [selectedOkxBitcoinAddress, setSelectedOkxBitcoinAddress] = useState<string | null>(null);
  const [btcBalance, setBtcBalance] = useState<NativeBalance>(EMPTY_NATIVE_BALANCE);
  const [btcBalanceLoading, setBtcBalanceLoading] = useState(false);
  const [stacksBalanceRefreshKey, setStacksBalanceRefreshKey] = useState(0);
  const [btcBalanceRefreshKey, setBtcBalanceRefreshKey] = useState(0);
  const [showGenerateAddressesModal, setShowGenerateAddressesModal] = useState(false);
  const [generatingAddresses, setGeneratingAddresses] = useState(false);
  const [generateAddressLayer, setGenerateAddressLayer] = useState<ReceiveLayer | null>(null);
  const [generateAddressAuthMode, setGenerateAddressAuthMode] = useState<'unlock' | 'create'>('unlock');
  const [createPasskeyError, setCreatePasskeyError] = useState<string | null>(null);

  const formatTokenBalance = useCallback((balance: string, decimals = 0) => {
    if (!balance) return '0';
    try {
      if (decimals > 0) {
        const divisor = Math.pow(10, decimals);
        const value = Number(balance) / divisor;
        if (!Number.isFinite(value)) return balance;
        return value >= 1
          ? value.toLocaleString(undefined, { maximumFractionDigits: 4 })
          : value.toPrecision(4);
      }
      return Number(balance).toLocaleString();
    } catch (error) {
      console.warn('Failed to format token balance', { balance, decimals, error });
      return balance;
    }
  }, []);

  // Modal states
  const [showReceive, setShowReceive] = useState(false);
  const [receiveAsset, setReceiveAsset] = useState<ReceiveAsset>('bitcoin');
  const [showSend, setShowSend] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendPassword, setSendPassword] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendMemo, setSendMemo] = useState("");
  const [sendAsset, setSendAsset] = useState<SendAsset>('bitcoin');
  const [extensionAvailable, setExtensionAvailable] = useState(false);
  const refreshStacksBalance = useCallback(() => setStacksBalanceRefreshKey((key) => key + 1), []);
  const refreshBtcBalance = useCallback(() => setBtcBalanceRefreshKey((key) => key + 1), []);
  const refreshSelectedSendAssetBalance = useCallback(() => {
    if (sendAsset === 'bitcoin') {
      setBtcBalanceRefreshKey((key) => key + 1);
      return;
    }
    setStacksBalanceRefreshKey((key) => key + 1);
  }, [sendAsset]);

  const selectedSendAsset = SEND_ASSETS.find((asset) => asset.id === sendAsset) ?? SEND_ASSETS[0];
  const trimmedRecipient = sendTo.trim();
  const parsedAmount = Number(sendAmount);
  const recipientError = (() => {
    if (!trimmedRecipient) return undefined;
    if (sendAsset === 'sbtc' && !STACKS_ADDRESS_REGEX.test(trimmedRecipient)) {
      return 'Enter a valid Stacks address for sBTC.';
    }
    if (sendAsset === 'bitcoin' && !isValidBitcoinAddress(trimmedRecipient, currentNetwork)) {
      return currentNetwork === 'mainnet'
        ? 'Enter a valid Bitcoin mainnet address.'
        : 'Enter a valid Bitcoin testnet address.';
    }
    return undefined;
  })();
  const amountError = sendAmount
    ? (!Number.isFinite(parsedAmount) || parsedAmount <= 0
      ? `Enter a valid ${selectedSendAsset.unit} amount`
      : sendAsset === 'sbtc' && (!Number.isInteger(parsedAmount) || parsedAmount < 1)
        ? 'Enter at least 1 satoshi'
        : sendAsset === 'bitcoin' && btcToSats(sendAmount) === null
          ? 'Enter a BTC amount with up to 8 decimal places'
        : undefined)
    : undefined;
  const unsupportedSendAssetMessage = selectedSendAsset.supported
    ? undefined
    : `${selectedSendAsset.label} sends need chain-specific signing and broadcasting support before they can be enabled.`;
  const isLocalWallet = walletType === 'imported';
  const selectedAssetNeedsPassword = (sendAsset === 'sbtc' && !extensionAvailable) || (sendAsset === 'bitcoin' && isLocalWallet);
  const selectedAssetCanUseCurrentSigner = sendAsset === 'bitcoin'
    ? !isLocalWallet || !!sendPassword
    : extensionAvailable || !!sendPassword;
  const supportsMemo = sendAsset === 'sbtc';
  const memoByteLength = useMemo(() => new TextEncoder().encode(sendMemo || '').length, [sendMemo]);
  const memoError = supportsMemo && memoByteLength > MAX_MEMO_BYTES ? `Memo must be ${MAX_MEMO_BYTES} bytes or fewer` : undefined;
  const passwordError = selectedAssetNeedsPassword && sendPassword && sendPassword.length < 8
    ? 'Password must be at least 8 characters'
    : undefined;
  const sendFormValid = Boolean(
    trimmedRecipient &&
    sendAmount &&
    selectedSendAsset.supported &&
    selectedAssetCanUseCurrentSigner &&
    !recipientError &&
    !amountError &&
    !memoError &&
    (!selectedAssetNeedsPassword || (!!sendPassword && !passwordError))
  );

  const availableBalanceValue = useMemo(() => {
    if (sendAsset === 'bitcoin') {
      return btcBalance.value ?? 0;
    }
    const sanitized = Number(String(sbtcBalance).replace(/,/g, ''));
    return Number.isFinite(sanitized) ? sanitized : 0;
  }, [btcBalance.value, sbtcBalance, sendAsset]);

  const remainingBalanceValue = useMemo(() => {
    if (!availableBalanceValue || !parsedAmount) {
      return null;
    }
    const remaining = availableBalanceValue - parsedAmount;
    return Number.isFinite(remaining) ? remaining : null;
  }, [availableBalanceValue, parsedAmount]);

  const quickFillOptions = useMemo(() => {
    if (!availableBalanceValue || availableBalanceValue <= 0) {
      return [];
    }
    const options = [
      { label: '25%', value: formatQuickFillAmount(availableBalanceValue * 0.25) },
      { label: '50%', value: formatQuickFillAmount(availableBalanceValue * 0.5) },
      { label: '75%', value: formatQuickFillAmount(availableBalanceValue * 0.75) },
      { label: 'All', value: formatQuickFillAmount(availableBalanceValue) }
    ];
    return options.filter((option): option is { label: string; value: string } => Boolean(option.value));
  }, [availableBalanceValue]);

  const maxFillValue = useMemo(() => formatQuickFillAmount(availableBalanceValue), [availableBalanceValue]);

  const getSendAssetBalanceDisplay = useCallback((asset: SendAsset) => {
    if (asset === 'bitcoin') {
      return btcBalance.display;
    }
    if (asset === 'sbtc') {
      if (sbtcBalance === '--') return '--';
      const sanitized = Number(String(sbtcBalance ?? '0').replace(/,/g, ''));
      return `${formatCompactBalance(Number.isFinite(sanitized) ? sanitized : 0)} BTC`;
    }
    const unit = SEND_ASSETS.find((sendAssetOption) => sendAssetOption.id === asset)?.unit ?? '';
    return `0.00${unit ? ` ${unit}` : ''}`;
  }, [btcBalance.display, sbtcBalance]);
  const selectedAssetBalanceDisplay = getSendAssetBalanceDisplay(sendAsset);
  const selectedAssetBalanceLoading = sendAsset === 'bitcoin' ? btcBalanceLoading : loading;
  const selectedAssetBalanceUnavailable = !selectedAssetBalanceLoading && (
    sendAsset === 'bitcoin' ? btcBalance.value === null : sbtcBalance === '--'
  );
  const sendActionLabel = selectedSendAsset.supported
    ? (sendAsset === 'bitcoin'
      ? isLocalWallet ? 'Send' : 'Send'
      : extensionAvailable ? 'Send via Extension' : 'Send')
    : 'Select Supported Asset';
  const summaryRecipientDisplay = trimmedRecipient ? abbreviateAddress(trimmedRecipient, 6) : 'Add recipient';
  const remainingBalanceDisplay = remainingBalanceValue !== null ? formatCompactBalance(Math.max(remainingBalanceValue, 0)) : null;

  const stxAsset = assets.find((asset) => asset.id === 'stx' || asset.symbol === 'STX');
  const choloAsset = assets.find((asset) => {
    const assetId = asset.id.toLowerCase();
    return asset.symbol.toLowerCase() === 'cholo' || FEATURED_TOKEN_CONTRACTS.has(assetId);
  });
  const stxBalanceDisplay = formatStacksAssetCardBalance(stxAsset?.formattedBalance);
  const choloBalanceDisplay = choloAsset?.formattedBalance ?? '0.00';
  const btcBalanceDisplay = formatAssetCardBalance(btcBalance);
  const visibleAssets = assets.filter((asset) => asset.symbol !== 'STX' && asset.id !== choloAsset?.id);
  const visibleAssetCount = visibleAssets.length + 1;
  const identityProviderLabel = walletType === 'nostria' ? 'Nostria Signer' : walletType === 'alby' ? 'Alby' : 'Nostr';
  const primaryBalanceDisplay = isNostrLightningAccount
    ? lightningBalance.display
    : isBitcoinOnlyAccount
      ? btcBalance.display
    : sbtcBalance;
  const primaryBalanceLoading = isNostrLightningAccount
    ? lightningBalance.status === 'loading'
    : isBitcoinOnlyAccount
      ? btcBalanceLoading
      : loading;
  const primaryBalanceUnavailable = !primaryBalanceLoading && (
    isNostrLightningAccount
      ? lightningBalance.status === 'unavailable'
      : isBitcoinOnlyAccount
        ? btcBalance.value === null
        : sbtcBalance === '--'
  );
  const stxBalanceUnavailable = !loading && sbtcBalance === '--';
  const primaryBalanceLabel = isNostrLightningAccount
    ? lightningBalance.status === 'available'
      ? 'Lightning balance'
      : 'Nostr account'
    : isBitcoinOnlyAccount
      ? 'Bitcoin balance'
    : 'Satoshis';

  const resetSendForm = () => {
    setSendTo("");
    setSendAmount("");
    setSendPassword("");
    setSendMemo("");
    setSendAsset('bitcoin');
  };

  const closeSendModal = () => {
    resetSendForm();
    setShowSend(false);
  };

  const closeReceiveModal = () => setShowReceive(false);

  const closeWalletModal = useCallback(() => {
    router.push('/');
  }, [router]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showReceive || showSend || showSwap || showGenerateAddressesModal) return;
      closeWalletModal();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeWalletModal, showGenerateAddressesModal, showReceive, showSend, showSwap]);

  useEffect(() => {
    if (isBitcoinOnlyAccount && receiveAsset !== 'bitcoin') {
      setReceiveAsset('bitcoin');
    }
  }, [isBitcoinOnlyAccount, receiveAsset]);

  const handleReceiveAssetKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>, asset: ReceiveAsset) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setReceiveAsset(asset);
  }, []);

  const copyReceiveAddress = useCallback(async (value: string, label: string) => {
    const copied = await copyToClipboard(value);
    if (copied) {
      toast.success(`${label} address copied!`);
    } else {
      toast.error(`Failed to copy ${label} address`);
    }
  }, []);

  const openGenerateAddressModal = useCallback((layer: ReceiveLayer) => {
    setGenerateAddressLayer(layer);
    setGenerateAddressAuthMode(getStoredEncryptedWallet() ? 'unlock' : 'create');
    setCreatePasskeyError(null);
    setShowGenerateAddressesModal(true);
  }, []);

  const closeGenerateAddressModal = useCallback(() => {
    if (generatingAddresses) return;
    setShowGenerateAddressesModal(false);
    setGenerateAddressLayer(null);
    setGenerateAddressAuthMode('unlock');
    setCreatePasskeyError(null);
  }, [generatingAddresses]);

  const persistGeneratedReceiveAddress = useCallback(async (wallet: WalletData, layer: ReceiveLayer) => {
    if (!wallet?.privateKey?.trim()) {
      throw new Error('Wallet unlocked, but this local account does not include a private key. Restore or reconnect the wallet before generating receive addresses.');
    }

    const bitcoinNetwork = currentNetwork === 'testnet' ? 'testnet' : 'mainnet';
    const addressUpdates: {
      bitcoinAddress?: string;
    } = {};

    if (layer === 'bitcoin') {
      const nextBitcoinAddress = wallet.bitcoinAddress || getBitcoinAddressFromPrivateKey(wallet.privateKey, bitcoinNetwork);
      addressUpdates.bitcoinAddress = nextBitcoinAddress;
    }

    const nextBitcoinAddress = addressUpdates.bitcoinAddress || wallet.bitcoinAddress || btcAddress || undefined;

    await saveReceiveAddressesToSupabase({
      address: address || wallet.address,
      ...(nextBitcoinAddress ? { bitcoinAddress: nextBitcoinAddress } : {}),
    });

    updateEncryptedWalletAddresses(addressUpdates);

    if (addressUpdates.bitcoinAddress) {
      setBtcAddress(addressUpdates.bitcoinAddress);
      setBtcAddressError(null);
    }

  }, [address, btcAddress, currentNetwork]);

  const handleGenerateAddress = useCallback(async (password: string) => {
    if (!generateAddressLayer) {
      throw new Error('Select an address layer to generate');
    }

    setGeneratingAddresses(true);

    try {
      const wallet = await retrieveEncryptedWallet(password);
      if (!wallet) {
        throw new Error('Invalid wallet password');
      }
      await persistGeneratedReceiveAddress(wallet, generateAddressLayer);
      setShowGenerateAddressesModal(false);
      setGenerateAddressLayer(null);
      toast.success(`${RECEIVE_LAYER_LABELS[generateAddressLayer]} address generated`);
    } finally {
      setGeneratingAddresses(false);
    }
  }, [generateAddressLayer, persistGeneratedReceiveAddress]);

  const handleCreatePasskeyAndGenerateAddress = useCallback(async (
    password: string,
    email?: string,
    verifiedEmailToken?: string
  ) => {
    if (!generateAddressLayer) {
      setCreatePasskeyError('Select an address layer to generate');
      return;
    }

    const trimmedEmail = email?.trim();
    if (!trimmedEmail) {
      setCreatePasskeyError('Email is required to create a passkey account.');
      return;
    }

    if (!verifiedEmailToken) {
      setCreatePasskeyError('Verify your email before creating your passkey account.');
      return;
    }

    setGeneratingAddresses(true);
    setCreatePasskeyError(null);

    try {
      const duplicateResponse = await fetch('/api/profile/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const duplicateResult = await duplicateResponse.json().catch(() => null);
      const profileAddressMatchesCurrent =
        typeof duplicateResult?.profileAddress === 'string' &&
        address &&
        duplicateResult.profileAddress.toLowerCase() === address.toLowerCase();
      const accountAddressMatchesCurrent =
        typeof duplicateResult?.accountAddress === 'string' &&
        address &&
        duplicateResult.accountAddress.toLowerCase() === address.toLowerCase();
      const duplicateBelongsToAnotherAddress =
        duplicateResult?.exists &&
        !profileAddressMatchesCurrent &&
        !accountAddressMatchesCurrent;

      if (duplicateResponse.ok && duplicateBelongsToAnotherAddress) {
        throw new Error('Email is already registered.');
      }

      const networkForWallet = currentNetwork === 'testnet' ? 'testnet' : 'mainnet';
      const {
        mnemonic,
        stxPrivateKey,
        address: walletAddress,
        bitcoinAddress,
        nostrPublicKey,
      } = await createStacksAccount(networkForWallet);

      const walletData: WalletData = {
        mnemonic,
        privateKey: stxPrivateKey,
        bitcoinAddress,
        nostrPublicKey,
        address: address || walletAddress,
        label: `CHOLO Wallet - ${trimmedEmail}`,
      };

      await createEncryptedWallet(walletData, password);
      if (!address) {
        persistCachedWalletState(walletData.address, 'imported');
        setAddress(walletData.address);
        setWalletType('imported');
      }

      const encryptedSnapshot = getStoredEncryptedWallet();
      if (!encryptedSnapshot) {
        throw new Error('Failed to capture encrypted wallet snapshot. Please try again.');
      }

      const saveResponse = await fetch('/api/save-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          verifiedEmailToken,
          passkey: stxPrivateKey,
          passphrase: password,
          address: walletData.address,
          encryptedWallet: {
            encryptedMnemonic: encryptedSnapshot.encryptedMnemonic,
            encryptedPrivateKey: encryptedSnapshot.encryptedPrivateKey,
            salt: encryptedSnapshot.salt,
            iv: encryptedSnapshot.iv,
            version: encryptedSnapshot.version,
            label: encryptedSnapshot.label,
            bitcoinAddress: encryptedSnapshot.bitcoinAddress,
          },
        }),
      });
      const saveResult = await saveResponse.json().catch(() => null);

      if (!saveResponse.ok) {
        if (saveResponse.status === 409) {
          throw new Error(saveResult?.error || 'Email is already registered.');
        }
        throw new Error(saveResult?.error || 'Failed to create passkey account.');
      }

      await fetch('/api/wallet-connect/account-created', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, bitcoinAddress: walletData.bitcoinAddress, preVerified: true }),
      }).catch((error) => {
        console.warn('Failed to send account created email:', error);
      });

      await persistGeneratedReceiveAddress(walletData, generateAddressLayer);
      setShowGenerateAddressesModal(false);
      setGenerateAddressLayer(null);
      toast.success(`${RECEIVE_LAYER_LABELS[generateAddressLayer]} address generated`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create passkey account';
      setCreatePasskeyError(message);
      throw error;
    } finally {
      setGeneratingAddresses(false);
    }
  }, [address, createEncryptedWallet, currentNetwork, generateAddressLayer, persistGeneratedReceiveAddress, setAddress, setWalletType]);

  const handlePasteRecipient = useCallback(async () => {
    if (sendLoading) {
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      toast.error("Clipboard unavailable in this context.");
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.error("Clipboard is empty.");
        return;
      }
      setSendTo(text.trim());
      toast.success("Recipient pasted.");
    } catch (error) {
      console.warn('Clipboard read failed', error);
      toast.error("Clipboard permission denied.");
    }
  }, [sendLoading]);

  const handleQuickFillValue = useCallback((value: string) => {
    if (!value || sendLoading) {
      return;
    }
    setSendAmount(value);
  }, [sendLoading]);

  const sendMethodTitle = selectedSendAsset.supported
    ? `Sending ${selectedSendAsset.label} ${sendAsset === 'bitcoin' && !isLocalWallet || extensionAvailable && sendAsset === 'sbtc' ? 'with Extension' : 'with Local Wallet'}`
    : `${selectedSendAsset.label} selected`;
  const sendMethodDescription = selectedSendAsset.supported
    ? (sendAsset === 'bitcoin' && isLocalWallet
      ? 'Your encrypted wallet password unlocks the local private key to sign and broadcast this BTC transfer.'
      : sendAsset === 'bitcoin'
      ? 'Your Bitcoin browser wallet will build, sign, fee, and broadcast this BTC transfer.'
      : extensionAvailable
      ? 'Your connected browser wallet will handle signing, fees, and confirmation prompts for this transfer.'
      : 'Your encrypted wallet password unlocks the private key locally to sign this transfer.')
    : unsupportedSendAssetMessage;
  const primaryReceiveAddress = btcAddress;
  const selectedReceiveAddress = receiveAsset === 'bitcoin'
    ? isOkxBitcoinAccount
      ? selectedOkxBitcoinAddress || primaryReceiveAddress
      : primaryReceiveAddress
    : address;
  const selectedReceiveLabel = RECEIVE_ASSET_LABELS[receiveAsset];
  const getReceiveCopyButtonClass = useCallback((asset: ReceiveAsset) => {
    const baseClass = 'shrink-0 text-sm p-2 rounded-lg transition';
    return receiveAsset === asset
      ? `${baseClass} text-foreground hover:bg-transparent`
      : `${baseClass} text-foreground hover:bg-muted`;
  }, [receiveAsset]);
  // Detect if Hiro Wallet extension is available and connected (optional, can remove if not needed)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.StacksProvider || window.XverseProviders?.StacksProvider)) {
      setExtensionAvailable(true);
    } else {
      setExtensionAvailable(false);
    }
  }, [showSend]);

  useEffect(() => {
    let cancelled = false;

    if (!isNostrLightningAccount) {
      setLightningBalance({ display: '--', status: 'idle' });
      return;
    }

    const loadLightningBalance = async () => {
      const browserWindow = typeof window !== 'undefined'
        ? window as typeof window & {
          alby?: { enable?: () => Promise<void>; webln?: BalanceCapableWebLN };
          webln?: BalanceCapableWebLN;
        }
        : undefined;
      const provider = walletType === 'alby'
        ? browserWindow?.alby?.webln ?? browserWindow?.webln
        : undefined;

      if (!provider?.getBalance) {
        setLightningBalance({ display: '--', status: 'unavailable' });
        return;
      }

      setLightningBalance({ display: 'Loading...', status: 'loading' });

      try {
        if (browserWindow?.alby?.enable) {
          await browserWindow.alby.enable();
        } else if (provider.enable) {
          await provider.enable();
        }

        const balance = await provider.getBalance();
        const balanceValue = typeof balance?.balance === 'number' ? balance.balance : null;

        if (!cancelled) {
          setLightningBalance({
            display: balanceValue === null ? '--' : formatLightningBalance(balanceValue, balance.currency),
            status: balanceValue === null ? 'unavailable' : 'available',
          });
        }
      } catch (error) {
        console.warn('Failed to fetch Lightning balance:', error);
        if (!cancelled) {
          setLightningBalance({ display: '--', status: 'unavailable' });
        }
      }
    };

    void loadLightningBalance();

    return () => {
      cancelled = true;
    };
  }, [isNostrLightningAccount, showSend, walletType]);

  useEffect(() => {
    let cancelled = false;

    if (!address || !isNostrLightningAccount) {
      setProfileLightningAddress(null);
      return;
    }

    getProfile(address)
      .then((profile) => {
        if (!cancelled) {
          setProfileLightningAddress(profile?.lightning_address || null);
        }
      })
      .catch((error) => {
        console.warn('Failed to load profile Lightning address:', error);
        if (!cancelled) {
          setProfileLightningAddress(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, isNostrLightningAccount]);

  // Stay aligned with the wallet's network (address prefixes reveal it)
  useEffect(() => {
    const inferredNetwork = inferNetworkFromAddress(address);
    if (inferredNetwork && inferredNetwork !== currentNetwork) {
      persistNetwork(inferredNetwork);
      setCurrentNetwork(inferredNetwork);
      return;
    }

    if (!inferredNetwork) {
      const persistedNetwork = getPersistedNetwork();
      if (persistedNetwork !== currentNetwork) {
        setCurrentNetwork(persistedNetwork);
      }
    }
  }, [address, currentNetwork]);

  // Fetch SBTC token balance and asset inventory
  useEffect(() => {
    if (isNostrLightningAccount || isBitcoinOnlyAccount) {
      setSbtcBalance(null);
      setAssets([]);
      setLoading(false);
      setAssetsLoading(false);
      return;
    }

    if (!address) {
      setSbtcBalance(null);
      setAssets([]);
      setLoading(false);
      setAssetsLoading(false);
      return;
    }
    
    setLoading(true);
    setAssetsLoading(true);
    
    const apiBaseUrl = getApiUrl(currentNetwork);
    const apiUrl = `${apiBaseUrl}/extended/v1/address/${address}/balances?unanchored=false`;
    const normalizedSbtcId = sbtcContractId?.toLowerCase();
    
    fetch(apiUrl)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Balances request failed with ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        type FungibleTokenData = {
          balance: string;
          total_sent?: string;
          total_received?: string;
          token?: {
            address: string;
            contractName: string;
            name?: string;
            symbol?: string;
            decimals?: number;
          };
        };

        const parsedAssets: WalletAsset[] = [];
        let detectedSbtcBalance: string | null = null;

        const stxBalanceRaw = data?.stx?.balance;
        if (typeof stxBalanceRaw === 'string') {
          parsedAssets.push({
            id: 'stx',
            name: 'Stacks',
            symbol: 'STX',
            formattedBalance: formatTokenBalance(stxBalanceRaw, 6),
            rawBalance: stxBalanceRaw,
            type: 'stx',
          });
        }

        const tokens = (data?.fungible_tokens || {}) as Record<string, FungibleTokenData>;

        Object.entries(tokens).forEach(([key, tokenData]) => {
          const decimals = typeof tokenData?.token?.decimals === 'number' ? tokenData.token.decimals : 0;
          const rawBalance = tokenData?.balance ?? '0';
          const symbol = tokenData?.token?.symbol || key.split('::').pop() || 'FT';
          const name = tokenData?.token?.name || symbol;
          const lowerKey = key.toLowerCase();
          const lowerSymbol = symbol.toLowerCase();
          const lowerName = name.toLowerCase();
          const isSbtcToken = Boolean(
            (normalizedSbtcId && lowerKey.startsWith(`${normalizedSbtcId}::`)) ||
            lowerSymbol.includes('sbtc') ||
            lowerName.includes('sbtc')
          );
          if (isSbtcToken) {
            detectedSbtcBalance = formatTokenBalance(rawBalance, decimals);
            return;
          }

          parsedAssets.push({
            id: key,
            name,
            symbol: symbol.toUpperCase(),
            formattedBalance: formatTokenBalance(rawBalance, decimals),
            rawBalance,
            type: 'fungible',
          });
        });

        parsedAssets.sort((a, b) => {
          const aVal = Number(a.rawBalance || '0');
          const bVal = Number(b.rawBalance || '0');
          return bVal - aVal;
        });

        const sbtcTokenBalance = detectedSbtcBalance ?? '0';
        const featuredAssets = parsedAssets.filter((asset) => {
          if (asset.symbol === 'STX') return true;
          const assetId = typeof asset.id === 'string' ? asset.id.toLowerCase() : '';
          const assetSymbol = typeof asset.symbol === 'string' ? asset.symbol.toLowerCase() : '';
          return FEATURED_TOKEN_CONTRACTS.has(assetId) || FEATURED_TOKEN_SYMBOLS.has(assetSymbol);
        });

        setAssets(featuredAssets);
        setSbtcBalance(sbtcTokenBalance);
        setLoading(false);
        setAssetsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch wallet balances:', error);
        setAssets([]);
        setSbtcBalance('--');
        setLoading(false);
        setAssetsLoading(false);
      });
  }, [address, currentNetwork, sbtcContractId, formatTokenBalance, isNostrLightningAccount, isBitcoinOnlyAccount, stacksBalanceRefreshKey]);

  // Send handler
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sendFormValid) {
      toast.error("Please fix the highlighted fields before sending.");
      return;
    }

    if (sendAsset !== 'sbtc' && sendAsset !== 'bitcoin') {
      toast.error(unsupportedSendAssetMessage || 'This asset is not supported for sending yet.');
      return;
    }

    setSendLoading(true);
    const recipient = trimmedRecipient;
    const amountInSats = sendAsset === 'bitcoin' ? btcToSats(sendAmount) : Number(sendAmount);
    const memoPayload = supportsMemo && !memoError ? sendMemo.trim() : '';

    if (!amountInSats || amountInSats <= 0) {
      toast.error(`Enter a valid ${selectedSendAsset.unit} amount.`);
      setSendLoading(false);
      return;
    }

    try {
      if (sendAsset === 'bitcoin') {
        if (isLocalWallet) {
          const wallet = await retrieveEncryptedWallet(sendPassword);
          if (!wallet?.privateKey) throw new Error('Invalid password or wallet not found');

          const txId = await sendBitcoinWithKey({
            privateKey: wallet.privateKey,
            toAddress: recipient,
            amountSats: amountInSats,
            network: currentNetwork,
          });

          toast.success(`BTC transfer sent! TXID: ${txId}`);
          closeSendModal();
          return;
        }

        const response = await satsRequest('sendTransfer', {
          recipients: [
            {
              address: recipient,
              amount: amountInSats,
            },
          ],
        });

        if (response.status === 'success') {
          toast.success(`BTC transfer sent! TXID: ${response.result.txid}`);
          closeSendModal();
          return;
        }

        if (!isWalletRequestCancelled(response.error)) {
          toast.error(getWalletErrorMessage(response.error, 'Bitcoin transfer failed'));
        }
        return;
      }

      const sbtcAmount = BigInt(amountInSats);

      if (extensionAvailable) {
        try {
          await sendSbtcDonation({
            amount: sbtcAmount,
            senderAddress: address,
            recipientAddress: recipient,
            memo: memoPayload,
            onFinish: (txId) => {
              toast.success(`sBTC transfer sent! TXID: ${txId}`);
            },
            onCancel: () => {
              toast('sBTC transfer cancelled');
            },
          });
          closeSendModal();
        } catch (err: unknown) {
          // Log the error object for debugging
          console.error('Extension transaction error:', err);
          const errorMsg = getWalletErrorMessage(err, 'Extension transaction failed');
          if (!isWalletRequestCancelled(err)) {
            toast.error(errorMsg);
          }
        }
        setSendLoading(false);
        return;
      }
      // 1. Decrypt wallet with password
      const wallet = await retrieveEncryptedWallet(sendPassword);
      if (!wallet || !wallet.privateKey) throw new Error("Invalid password or wallet not found");

      const txId = await sendSbtcDonationWithKey({
        amount: sbtcAmount,
        senderAddress: wallet.address,
        recipientAddress: recipient,
        memo: memoPayload,
        privateKey: wallet.privateKey,
      });

      toast.success(`sBTC transfer sent! TXID: ${txId}`);
      closeSendModal();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || 'Error sending sBTC');
      } else {
        toast.error("Error sending sBTC");
      }
    } finally {
      setSendLoading(false);
    }
  };

  // Recent transactions state
  // Define a minimal transaction type for recent transactions
  type RecentTransaction = {
    tx_id: string;
    tx_type: string;
    sender_address: string;
    token_transfer?: {
      recipient_address: string;
      amount: string;
    };
    burn_block_time_iso?: string;
    [key: string]: unknown;
  };
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Fetch recent transactions
  useEffect(() => {
    if (!address || isNostrLightningAccount || isBitcoinOnlyAccount) {
      setTransactions([]);
      setTxLoading(false);
      return;
    }
    setTxLoading(true);
    fetchRecentTransactions<RecentTransaction>(address, currentNetwork, 10)
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, [address, currentNetwork, showSend, isNostrLightningAccount, isBitcoinOnlyAccount]);

  useEffect(() => {
    if (address && isBitcoinOnlyAccount) {
      setBtcAddress(address);
      setBtcAddressError(null);
      setBtcAddressLoading(false);
      return;
    }

    if (!address || isNostrLightningAccount) {
      setBtcAddress(null);
      setBtcAddressError(null);
      setBtcAddressLoading(false);
      setBtcBalance(EMPTY_NATIVE_BALANCE);
      setBtcBalanceLoading(false);
      return;
    }

    setBtcAddressLoading(true);
    setBtcAddressError(null);

    const apiBaseUrl = getApiUrl(currentNetwork);
    const accountUrl = `${apiBaseUrl}/v2/accounts/${address}`;

    fetch(accountUrl)
      .then(async (res) => {
        if (!res.ok) {
          let message = `Account lookup failed with ${res.status}`;
          try {
            const payload = await res.json();
            if (payload && typeof payload === 'object') {
              const errorValue = (payload as { error?: unknown }).error;
              if (typeof errorValue === 'string') {
                message = errorValue;
              } else if (typeof errorValue === 'object' && errorValue !== null) {
                const text = getWalletErrorMessage(errorValue, message);
                if (text) message = text;
              }
            }
          } catch {
            // ignore parse failures
          }
          throw new Error(message);
        }
        return res.json();
      })
      .then(data => {
        const btcInfo = data?.btc_address;
        const derivedAddress = typeof btcInfo === 'string'
          ? btcInfo
          : btcInfo?.p2wpkh || btcInfo?.bech32 || btcInfo?.p2tr || null;

        const storedWallet = getStoredEncryptedWallet();
        const localBitcoinAddress = storedWallet?.bitcoinAddress ?? null;
        const finalAddress = derivedAddress || localBitcoinAddress;

        setBtcAddress(finalAddress);
        if (!finalAddress) {
          setBtcAddressError('No Bitcoin address reported for this account yet.');
        }
      })
      .catch(error => {
        console.error('Failed to fetch Bitcoin L1 address:', error);
        const storedWallet = getStoredEncryptedWallet();
        const localBitcoinAddress = storedWallet?.bitcoinAddress ?? null;
        if (localBitcoinAddress) {
          setBtcAddress(localBitcoinAddress);
          setBtcAddressError(null);
        } else {
          setBtcAddress(null);
          setBtcAddressError(getWalletErrorMessage(error, 'Unable to derive Bitcoin address. Check your wallet connection and network.'));
        }
      })
      .finally(() => setBtcAddressLoading(false));
  }, [address, currentNetwork, isNostrLightningAccount, isBitcoinOnlyAccount]);

  useEffect(() => {
    let cancelled = false;

    if (!isOkxBitcoinAccount || !address) {
      setOkxBitcoinAccounts([]);
      setSelectedOkxBitcoinAddress(null);
      return;
    }

    const fallbackAccount = { address, addressType: 'unknown', label: 'Bitcoin' } satisfies OkxBitcoinAccount;
    setOkxBitcoinAccounts((current) => current.length > 0 ? current : [fallbackAccount]);
    setSelectedOkxBitcoinAddress((current) => current || address);

    withTimeout(getOkxBitcoinAccounts(), OKX_ACCOUNTS_TIMEOUT_MS)
      .then((accounts) => {
        if (cancelled) return;
        const nextAccounts = accounts.length > 0
          ? accounts
          : [fallbackAccount];
        setOkxBitcoinAccounts(nextAccounts);
        setSelectedOkxBitcoinAddress((current) => {
          if (current && nextAccounts.some((account) => account.address === current)) {
            return current;
          }
          return nextAccounts[0]?.address ?? address;
        });
      })
      .catch((error) => {
        if (!isTimeoutError(error)) {
          console.warn('Failed to load OKX Bitcoin accounts:', error);
        }
        if (!cancelled) {
          setOkxBitcoinAccounts([fallbackAccount]);
          setSelectedOkxBitcoinAddress(address);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, isOkxBitcoinAccount]);

  useEffect(() => {
    let cancelled = false;

    if (!btcAddress) {
      setBtcBalance(EMPTY_NATIVE_BALANCE);
      setBtcBalanceLoading(false);
      return;
    }

    setBtcBalance(ZERO_BTC_NATIVE_BALANCE);
    setBtcBalanceLoading(true);
    const { controller, timeoutId } = createTimedAbortController(BALANCE_FETCH_TIMEOUT_MS);
    fetchBitcoinBalance(btcAddress, currentNetwork, controller.signal)
      .then((balance) => {
        if (!cancelled) setBtcBalance(balance);
      })
      .catch((error) => {
        if (!isTimeoutError(error) && !controller.signal.aborted) {
          console.error('Failed to fetch Bitcoin balance:', error);
        }
        if (!cancelled) setBtcBalance(ZERO_BTC_NATIVE_BALANCE);
      })
      .finally(() => {
        if (!cancelled) setBtcBalanceLoading(false);
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [btcAddress, currentNetwork, showSend, isBitcoinOnlyAccount, btcBalanceRefreshKey]);

  // If no wallet address, ask to connect wallet
  if (!address) {
    return (
      <>
      <HomePage />
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-transparent px-4 py-6 text-black backdrop-blur-xl dark:text-foreground"
        onClick={closeWalletModal}
        role="presentation"
      >
        <div
          className="wallet-dark-scrollbars relative max-h-[calc(100dvh-3rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-white p-8 shadow-2xl dark:bg-background"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-modal-title"
        >
          <button type="button" onClick={closeWalletModal} className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Cerrar billetera">
            <X size={20} />
          </button>
          <div className="flex flex-col items-center justify-center select-none">
          <h1 id="wallet-modal-title" className="text-3xl font-bold mb-6"><LocalizedText>Wallet</LocalizedText></h1>
          <p className="mb-8 text-lg text-muted-foreground text-center">
            <LocalizedText>Please connect your wallet to manage your funds.
          </LocalizedText></p>
          <Link
            href="/"
            className="py-2 px-6 rounded-xl border bg-transparent text-foreground hover:bg-muted border-border transition-all duration-200 focus:outline-none cursor-pointer select-none"
          >
            <LocalizedText>Connect Wallet
          </LocalizedText></Link>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    <HomePage />
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto overscroll-contain bg-transparent px-3 py-4 text-black backdrop-blur-xl dark:text-foreground sm:items-center sm:px-6 sm:py-8"
      onClick={closeWalletModal}
      role="presentation"
    >

      <div
        className="wallet-dark-scrollbars relative max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-white p-5 text-black shadow-2xl dark:bg-background dark:text-foreground sm:max-h-[calc(100dvh-3rem)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
      >
        <button type="button" onClick={closeWalletModal} className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Cerrar billetera">
          <X size={20} />
        </button>
        <div className="my-2 flex items-center justify-start gap-3">
          <Wallet className="w-8 h-8 text-foreground" />
          <h1 id="wallet-modal-title" className="title text-lg font-bold"><LocalizedText>Wallet</LocalizedText></h1>
        </div>
        <div className="mt-4 flex justify-center">
        <div className="flex items-center gap-3">
          {loading && !isNostrLightningAccount && !isBitcoinOnlyAccount ? (
            <LoaderCircle className="animate-spin text-foreground" size={32} />
          ) : (
            <div className="my-4 text-center">
              <BalanceDisplay
                loading={primaryBalanceLoading}
                unavailable={primaryBalanceUnavailable}
                onRefresh={isBitcoinOnlyAccount ? refreshBtcBalance : isNostrLightningAccount ? undefined : refreshStacksBalance}
                className="title text-2xl font-bold select-all"
              >
                {isNostrLightningAccount && lightningBalance.status !== "available"
                  ? abbreviateAddress(address, 8)
                  : primaryBalanceDisplay}
              </BalanceDisplay>
              <div className="text-lg">{primaryBalanceLabel}</div>
            </div>
          )}
        </div>
      </div>

      {/* Network and Address Info - Only show if not mainnet */}
      {!isNostrLightningAccount && !isBitcoinOnlyAccount && currentNetwork !== 'mainnet' && (
        <div className="mb-16 p-4 bg-transparent rounded-lg">
          <div className="flex items-center justify-center text-sm">
            <span className="text-primary text-center uppercase">{currentNetwork}</span>
          </div>
        </div>
      )}
    
      
      {isNostrLightningAccount ? (
        <button
          className="mb-4 w-full bg-transparent border border-border text-foreground px-6 py-2.5 rounded-xl hover:bg-muted cursor-pointer select-none transition-all duration-200"
          onClick={() => copyReceiveAddress(address, 'Nostr account')}
          type="button"
        >
          <LocalizedText>Copy Account
        </LocalizedText></button>
      ) : isBitcoinOnlyAccount ? (
        <button
          className="mb-4 w-full bg-transparent border border-border text-foreground px-6 py-2.5 rounded-xl hover:bg-muted cursor-pointer select-none transition-all duration-200"
          onClick={() => setShowReceive(true)}
        >
          <LocalizedText>Receive
        </LocalizedText></button>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <button
            className="border border-border bg-transparent text-foreground w-full px-6 py-3 rounded-xl hover:bg-muted cursor-pointer select-none transition-all duration-200"
            onClick={() => setShowSend(true)}
          >
            <LocalizedText>Send
          </LocalizedText></button>
          <button
            className="border border-border bg-transparent text-foreground px-6 py-3 rounded-xl hover:bg-muted cursor-pointer select-none transition-all duration-200"
            onClick={() => setShowReceive(true)}
          >
            <LocalizedText>Receive
          </LocalizedText></button>
        </div>
      )}

      {!isNostrLightningAccount && !isBitcoinOnlyAccount && (
        <button
          type="button"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-6 py-2.5 text-foreground transition-all duration-200 hover:bg-muted"
          onClick={() => setShowSwap(true)}
        >
          <Image src="/swap.svg" alt="" width={18} height={18} aria-hidden="true" />
          <span><LocalizedText>Swap</LocalizedText></span>
        </button>
      )}

      <div className="mt-6 w-full">
        <div className="flex items-center justify-between">
          {!isNostrLightningAccount && !isBitcoinOnlyAccount && !assetsLoading && (
            <span className="text-xs text-muted-foreground">{visibleAssetCount} <LocalizedText>assets</LocalizedText></span>
          )}
        </div>

        <div className="mt-2 rounded-xl border border-border bg-transparent">
          {isNostrLightningAccount ? (
            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-transparent p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Image src={walletType === "nostria" ? '/nostria.svg' : '/alby.svg'} alt={identityProviderLabel} width={28} height={28} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{identityProviderLabel}</div>
                    <div className="text-xs text-muted-foreground"><LocalizedText>Nostr account</LocalizedText></div>
                  </div>
                </div>
                <div className="text-right min-w-0">
                  <div className="text-sm font-mono truncate max-w-40">{address}</div>
                  <div className="text-xs text-muted-foreground"><LocalizedText>Connected</LocalizedText></div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-transparent p-3">
                <div className="flex items-center gap-3">
                  <Image src="/icons/lightning.svg" alt="Lightning" width={28} height={28} />
                  <div>
                    <div className="text-sm font-semibold"><LocalizedText>Lightning</LocalizedText></div>
                    <div className="text-xs text-muted-foreground">
                      {profileLightningAddress || (lightningBalance.status === "unavailable" ? "Provider balance unavailable" : "Wallet balance")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <BalanceDisplay
                    loading={lightningBalance.status === "loading"}
                    unavailable={lightningBalance.status === "unavailable" && !profileLightningAddress}
                  >
                    {lightningBalance.status === "available" ? lightningBalance.display : profileLightningAddress ? "Configured" : lightningBalance.display}
                  </BalanceDisplay>
                  <div className="text-xs text-muted-foreground">
                    {lightningBalance.status === "available" ? "Balance" : profileLightningAddress ? "Address set" : "Balance unavailable"}
                  </div>
                </div>
              </div>

              {!profileLightningAddress && (
                <Link
                  href="/account#lightning-address"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  <LocalizedText>Set Lightning Address
                </LocalizedText></Link>
              )}
            </div>
          ) : (
          <div className="space-y-2 p-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-transparent p-3">
              <div className="flex items-center gap-3">
                <Image src="/btc.svg" alt="Bitcoin" width={28} height={28} />
                <div>
                  <div className="text-sm font-semibold"><LocalizedText>Bitcoin</LocalizedText></div>
                  <div className="text-xs text-muted-foreground"><LocalizedText>BTC</LocalizedText></div>
                </div>
              </div>
              <div className="text-right">
                <BalanceDisplay loading={btcBalanceLoading} unavailable={btcBalance.value === null} onRefresh={refreshBtcBalance}>
                  {btcBalanceDisplay}
                </BalanceDisplay>
                <div className="text-xs text-muted-foreground"><LocalizedText>Balance</LocalizedText></div>
              </div>
            </div>

            {!isBitcoinOnlyAccount && (
            <>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-transparent p-3">
              <div className="flex items-center gap-3">
                <Image src="/stx.png" alt="Stacks" width={28} height={28} />
                <div>
                  <div className="text-sm font-semibold"><LocalizedText>Stacks</LocalizedText></div>
                  <div className="text-xs text-muted-foreground"><LocalizedText>STX</LocalizedText></div>
                </div>
              </div>
              <div className="text-right">
                <BalanceDisplay loading={loading} unavailable={stxBalanceUnavailable} onRefresh={refreshStacksBalance}>
                  {stxBalanceDisplay}
                </BalanceDisplay>
                <div className="text-xs text-muted-foreground"><LocalizedText>Balance</LocalizedText></div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-transparent p-3">
              <div className="flex items-center gap-3">
                <Image className="rounded-full object-cover" src="/cholo/cholo-hero.png" alt="CHOLO" width={28} height={28} />
                <div>
                  <div className="text-sm font-semibold">Cholo</div>
                  <div className="text-xs text-muted-foreground">CHOLO</div>
                </div>
              </div>
              <div className="text-right">
                <BalanceDisplay loading={assetsLoading} onRefresh={refreshStacksBalance}>
                  {choloBalanceDisplay}
                </BalanceDisplay>
                <div className="text-xs text-muted-foreground"><LocalizedText>Balance</LocalizedText></div>
              </div>
            </div>
            </>
            )}
          </div>
          )}

          {!isNostrLightningAccount && !isBitcoinOnlyAccount && assetsLoading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((skeleton) => (
                <div key={skeleton} className="h-10 rounded-lg bg-transparent animate-pulse" />
              ))}
            </div>
          ) : !isNostrLightningAccount && !isBitcoinOnlyAccount && visibleAssetCount === 0 ? (
            <div className="p-4 text-sm text-muted-foreground hidden"><LocalizedText>No assets detected for this wallet yet.</LocalizedText></div>
          ) : !isNostrLightningAccount && !isBitcoinOnlyAccount ? (
            <ul>
              {visibleAssets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center justify-between px-4 py-3 border-b border-border/60 last:border-b-0"
                >
                  <div>
                    <div className="font-semibold tracking-wide">{asset.symbol}</div>
                    <div className="text-xs text-muted-foreground">{asset.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{asset.formattedBalance}</div>
                    <div className="text-[11px] uppercase text-muted-foreground">
                      {asset.type === "stx" ? "Stacks" : "Token"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Send Modal */}
      {showSwap && (
        <BitflowSwapPanel
          address={address}
          walletType={walletType}
          network={currentNetwork}
          onClose={() => setShowSwap(false)}
          onComplete={() => {
            window.setTimeout(refreshStacksBalance, 5_000);
          }}
        />
      )}

      {showSend && (
        <div
          className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/50 px-4 pb-4 pt-20 backdrop-blur-sm sm:items-center sm:py-6"
          onClick={() => {
            if (!sendLoading) closeSendModal();
          }}
        >
          <div
            className="flex max-h-[calc(100dvh-6rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-white text-black shadow-xl dark:bg-background dark:text-foreground sm:max-h-[calc(100dvh-3rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-border/60">
              <div>
                <h2 className="text-xl font-semibold"><LocalizedText>Send Bitcoin</LocalizedText></h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedSendAsset.networkLabel}
                  {currentNetwork !== 'mainnet' && sendAsset === "sbtc" && (
                    <span className="ml-1 font-mono uppercase">{currentNetwork}</span>
                  )}
                </p>
              </div>
              <button
                onClick={closeSendModal}
                className="bg-transparent border-none text-muted-foreground hover:text-foreground text-xl cursor-pointer disabled:opacity-40"
                aria-label="Cerrar"
                type="button"
                disabled={sendLoading}
              >
                <X className="h-[20px]" />
              </button>
            </div>

            <form onSubmit={handleSend} className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="send-asset">
                  <LocalizedText>Asset
                </LocalizedText></label>
                <select
                  id="send-asset"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                  value={sendAsset}
                  onChange={(event) => setSendAsset(event.target.value as SendAsset)}
                  disabled={sendLoading}
                >
                  {SEND_ASSETS.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.label} - {getSendAssetBalanceDisplay(asset.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-border bg-transparent p-4 text-sm">
                <p className="font-medium">{sendMethodTitle}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{sendMethodDescription}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  <LocalizedText>Available balance:
                  </LocalizedText><BalanceDisplay
                    loading={selectedAssetBalanceLoading}
                    unavailable={selectedAssetBalanceUnavailable}
                    onRefresh={refreshSelectedSendAssetBalance}
                    className="ml-1 align-middle text-xs font-semibold"
                  >
                    {selectedAssetBalanceDisplay}
                  </BalanceDisplay>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="send-recipient">
                  <LocalizedText>Recipient Address
                </LocalizedText></label>
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                  <input
                    id="send-recipient"
                    className={`min-w-0 w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 ${recipientError ? 'border-destructive/70' : 'border-border'}`}
                    value={sendTo}
                    onChange={e => setSendTo(e.target.value)}
                    required
                    placeholder={selectedSendAsset.placeholder}
                    disabled={sendLoading}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={handlePasteRecipient}
                    disabled={sendLoading}
                    aria-label="Pegar dirección desde el portapapeles"
                  >
                    <LocalizedText>Paste
                  </LocalizedText></button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{selectedSendAsset.recipientHint}</p>
                {recipientError && (
                  <p className="text-xs text-destructive mt-2">{recipientError}</p>
                )}
                {unsupportedSendAssetMessage && (
                  <p className="text-xs text-amber-600 dark:text-amber-300 mt-2">{unsupportedSendAssetMessage}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="send-amount">
                  <LocalizedText>Amount
                </LocalizedText></label>
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                  <input
                    id="send-amount"
                    className={`min-w-0 w-full px-4 py-3 rounded-xl border bg-background text-foreground text-right text-2xl focus:outline-none focus:ring-2 focus:ring-primary/60 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${amountError ? 'border-destructive/70' : 'border-border'}`}
                    type="number"
                    min={sendAsset === "sbtc" ? 1 : 0.00000001}
                    step={sendAsset === "sbtc" ? 1 : 0.00000001}
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                    required
                    placeholder={sendAsset === "sbtc" ? '1000' : '0.00000000'}
                    disabled={sendLoading}
                    style={{ MozAppearance: "textfield" } as React.CSSProperties}
                  />
                  <button
                    type="button"
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => handleQuickFillValue(maxFillValue)}
                    disabled={sendLoading || !maxFillValue}
                  >
                    <LocalizedText>Max
                  </LocalizedText></button>
                </div>
                <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground">
                  <span>{sendAsset === "sbtc" ? "Minimum 1 sat" : "Amount in BTC"}</span>
                  <span className="inline-flex items-center gap-1">
                    <LocalizedText>Available
                    </LocalizedText><BalanceDisplay
                      loading={selectedAssetBalanceLoading}
                      unavailable={selectedAssetBalanceUnavailable}
                      onRefresh={refreshSelectedSendAssetBalance}
                      className="text-xs"
                    >
                      {selectedAssetBalanceDisplay}
                    </BalanceDisplay>
                  </span>
                </div>
                {quickFillOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {quickFillOptions.map(option => (
                      <button
                        key={option.label}
                        type="button"
                        className="px-3 py-1.5 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => handleQuickFillValue(option.value)}
                        disabled={sendLoading}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
                {amountError && (
                  <p className="text-xs text-destructive mt-2">{amountError}</p>
                )}
              </div>

              {supportsMemo && (
                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor="send-memo">
                    <LocalizedText>Memo (optional)
                  </LocalizedText></label>
                  <textarea
                    id="send-memo"
                    className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none ${memoError ? 'border-destructive/70' : 'border-border'}`}
                    rows={2}
                    maxLength={120}
                    value={sendMemo}
                    onChange={e => setSendMemo(e.target.value)}
                    placeholder="Agrega una nota para tus registros"
                    disabled={sendLoading}
                  />
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className={memoError ? 'text-destructive' : 'text-muted-foreground'}>
                      {memoByteLength}/{MAX_MEMO_BYTES} <LocalizedText>bytes
                    </LocalizedText></span>
                    {!memoError && (
                      <span className="text-muted-foreground">
                        <LocalizedText>Memo limit enforced by the sBTC contract
                      </LocalizedText></span>
                    )}
                  </div>
                  {memoError && <p className="text-xs text-destructive mt-2">{memoError}</p>}
                </div>
              )}

              {(sendAmount || trimmedRecipient) && (
                <div className="rounded-2xl border border-border bg-transparent p-4 text-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground"><LocalizedText>Network</LocalizedText></span>
                    <span className="font-mono uppercase">{currentNetwork}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-muted-foreground"><LocalizedText>Recipient</LocalizedText></span>
                    <span className={`font-mono text-xs ${trimmedRecipient ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {summaryRecipientDisplay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-muted-foreground"><LocalizedText>Amount</LocalizedText></span>
                    <span className="font-semibold text-lg">{sendAmount || '0'} {selectedSendAsset.unit}</span>
                  </div>
                  {remainingBalanceDisplay && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span><LocalizedText>Remaining balance</LocalizedText></span>
                      <span>{remainingBalanceDisplay} {selectedSendAsset.unit}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                    <span><LocalizedText>Method</LocalizedText></span>
                    <span>{sendAsset === "bitcoin" && !isLocalWallet || extensionAvailable && sendAsset === "sbtc" ? "Browser extension" : "Encrypted wallet"}</span>
                  </div>
                </div>
              )}

              {selectedAssetNeedsPassword && selectedSendAsset.supported && (
                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor="send-password">
                    <LocalizedText>Wallet Password
                  </LocalizedText></label>
                  <input
                    id="send-password"
                    className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 ${passwordError ? 'border-destructive/70' : 'border-border'}`}
                    type="password"
                    value={sendPassword}
                    onChange={e => setSendPassword(e.target.value)}
                    required
                    placeholder="Ingresa la contraseña que creaste"
                    disabled={sendLoading}
                    autoComplete="current-password"
                  />
                  <p className="text-xs text-muted-foreground mt-2"><LocalizedText>Required to decrypt and sign with your local wallet.</LocalizedText></p>
                  {passwordError && <p className="text-xs text-destructive mt-2">{passwordError}</p>}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl border border-border bg-transparent text-foreground transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-muted"
                disabled={sendLoading || !sendFormValid}
              >
                {sendLoading ? (sendAsset === "bitcoin" && !isLocalWallet || extensionAvailable && sendAsset === "sbtc" ? "Sending via extension..." : "Sending...") : sendActionLabel}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/50 px-4 pb-4 pt-20 backdrop-blur-sm sm:items-center sm:py-6"
          onClick={closeReceiveModal}
        >
          <div
            className="max-h-[calc(100dvh-6rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-2xl border border-border bg-white p-6 text-center text-black shadow-xl dark:bg-background dark:text-foreground sm:max-h-[calc(100dvh-3rem)] sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end">
              <button
                onClick={closeReceiveModal}
                className="bg-transparent border-none text-muted-foreground hover:text-foreground text-xl cursor-pointer"
                aria-label="Cerrar"
                type="button"
              >
                <X className="h-[18px]" />
              </button>
            </div>
            <h2 className="text-xl font-bold mb-6"><LocalizedText>Receive </LocalizedText>{selectedReceiveLabel}</h2>
            <div className="mb-6">
              {selectedReceiveAddress ? (
                <div className="w-full p-6 flex items-center justify-center rounded-xl bg-white">
                  <QRCodeSVG
                    value={selectedReceiveAddress}
                    width="100%"
                    height="100%"
                    size={256}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    includeMargin={false}
                    level="M"
                    style={{ width: "100%", height: "auto", maxWidth: 256, maxHeight: 256 }}
                  />
                </div>
              ) : (
                <div className="w-full min-h-56 mx-auto bg-transparent flex flex-col items-center justify-center gap-3 rounded-xl text-muted-foreground">
                  {btcAddressLoading ? (
                    <LoaderCircle className="animate-spin" size={28} />
                  ) : (
                    <>
                      <div className="text-sm"><LocalizedText>No </LocalizedText>{selectedReceiveLabel} <LocalizedText>address yet</LocalizedText></div>
                      {receiveAsset !== "stacks" && !isBitcoinOnlyAccount && (
                        <button
                          type="button"
                          className="rounded-lg border border-border bg-transparent px-4 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => openGenerateAddressModal(receiveAsset)}
                          disabled={generatingAddresses}
                        >
                          <LocalizedText>Generate </LocalizedText>{selectedReceiveLabel} <LocalizedText>Address
                        </LocalizedText></button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-4">
              {isOkxBitcoinAccount ? (
                <div className="grid gap-3 text-left">
                  {(okxBitcoinAccounts.length > 0
                    ? okxBitcoinAccounts
                    : [{ address: address || '', addressType: 'unknown', label: 'Bitcoin' } satisfies OkxBitcoinAccount]
                  ).filter((account) => account.address).map((account) => {
                    const selected = (selectedOkxBitcoinAddress || primaryReceiveAddress) === account.address;
                    return (
                      <div
                        key={`${account.addressType}-${account.address}`}
                        role="button"
                        tabIndex={0}
                        className={`p-4 rounded-2xl border text-left text-sm transition ${selected ? 'border-foreground bg-transparent text-foreground' : 'border-border bg-transparent hover:bg-muted'}`}
                        onClick={() => setSelectedOkxBitcoinAddress(account.address)}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) return;
                          if (event.key !== "Enter" && event.key !== ' ') return;
                          event.preventDefault();
                          setSelectedOkxBitcoinAddress(account.address);
                        }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <Image src="/btc.svg" alt="Bitcoin" width={28} height={28} />
                            <div className="min-w-0">
                              <div className="font-semibold">{account.label}</div>
                              <div className="font-mono text-xs text-muted-foreground">{abbreviateMiddle(account.address)}</div>
                            </div>
                          </div>
                          <button
                            className={getReceiveCopyButtonClass('bitcoin')}
                            type="button"
                            aria-label={`Copy ${account.label} address`}
                            onClick={async (event) => {
                              event.stopPropagation();
                              await copyReceiveAddress(account.address, account.label);
                            }}
                          >
                            <Copy size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <div
                role="button"
                tabIndex={0}
                className={`w-full rounded-2xl border p-4 text-left transition ${receiveAsset === "bitcoin" ? 'border-foreground bg-transparent text-foreground' : 'border-border bg-transparent hover:bg-muted'}`}
                onClick={() => setReceiveAsset('bitcoin')}
                onKeyDown={(event) => handleReceiveAssetKeyDown(event, 'bitcoin')}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground"><LocalizedText>Bitcoin L1</LocalizedText></span>
                  {!btcAddressLoading && !primaryReceiveAddress && !isBitcoinOnlyAccount && (
                    <button
                      type="button"
                      className="rounded-lg border h-full border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={(event) => {
                        event.stopPropagation();
                        openGenerateAddressModal('bitcoin');
                      }}
                      disabled={generatingAddresses}
                    >
                      <LocalizedText>Generate
                    </LocalizedText></button>
                  )}
                </div>
                {btcAddressLoading ? (
                  <div className="text-sm"><LocalizedText>Loading address...</LocalizedText></div>
                ) : primaryReceiveAddress ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm break-all">{primaryReceiveAddress}</span>
                    <button
                      className={getReceiveCopyButtonClass('bitcoin')}
                      type="button"
                      aria-label="Copiar dirección de Bitcoin"
                      onClick={async (event) => {
                        event.stopPropagation();
                        await copyReceiveAddress(primaryReceiveAddress, 'Bitcoin');
                      }}
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-destructive">{btcAddressError || "No Bitcoin address available."}</div>
                )}
              </div>
              )}

              {!isBitcoinOnlyAccount && (
              <div className="grid gap-3 text-left">
                <div
                  role="button"
                  tabIndex={0}
                  className={`p-4 rounded-2xl border text-left text-sm transition ${receiveAsset === "stacks" ? 'border-foreground bg-transparent text-foreground' : 'border-border bg-transparent text-foreground hover:bg-muted'}`}
                  onClick={() => setReceiveAsset('stacks')}
                  onKeyDown={(event) => handleReceiveAssetKeyDown(event, 'stacks')}
                >
                  <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground"><LocalizedText>Stacks</LocalizedText></div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm break-all">{address}</span>
                    <button
                      className={getReceiveCopyButtonClass('stacks')}
                      type="button"
                      aria-label="Copiar dirección de Stacks"
                      onClick={async (event) => {
                        event.stopPropagation();
                        await copyReceiveAddress(address, 'Stacks');
                      }}
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>

              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {generateAddressAuthMode === 'unlock' ? (
        <PasswordSigningModal
          isOpen={showGenerateAddressesModal}
          onClose={closeGenerateAddressModal}
          onSign={handleGenerateAddress}
          title={`Generate ${generateAddressLayer ? RECEIVE_LAYER_LABELS[generateAddressLayer] : "Receive"} Address`}
          description={`Enter your wallet password to decrypt the local private key and generate ${generateAddressLayer ? `your ${RECEIVE_LAYER_LABELS[generateAddressLayer]}` : "the selected"} receive address in this browser.`}
          actionText="Generate"
          isLoading={generatingAddresses}
        />
      ) : (
        <CreatePasskeyAddressModal
          isOpen={showGenerateAddressesModal}
          onClose={closeGenerateAddressModal}
          onSubmit={handleCreatePasskeyAndGenerateAddress}
          title={`Create Passkey Account`}
          description={`Create a passkey account with your email and password to generate ${generateAddressLayer ? `your ${RECEIVE_LAYER_LABELS[generateAddressLayer]}` : "the selected"} receive address.`}
          error={createPasskeyError}
          isLoading={generatingAddresses}
        />
      )}

      {/* Recent Transactions */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4"><LocalizedText>Recent Transactions</LocalizedText></h2>
        <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-background py-2">
          {txLoading ? (
            <div className="flex justify-center items-center py-8">
              <LoaderCircle className="animate-spin text-foreground" size={32} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8"><LocalizedText>No recent transactions found.</LocalizedText></div>
          ) : (
            <ul className="space-4 mx-4">
              {transactions.map((tx) => (
                <li key={tx.tx_id} className="border-b border-border last:border-b-0 pb-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-muted-foreground break-all">
                        <a href={`https://explorer.hiro.so/txid/${tx.tx_id}?chain=${currentNetwork}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-accent hover:text-accent/80 hover:underline">
                          {tx.tx_id.slice(0, 10)}...{tx.tx_id.slice(-8)}
                        </a>
                      </div>
                      <div className="text-sm mt-1">
                        {tx.tx_type === "token_transfer" ? (
                          <>
                            <span className="font-semibold">{tx.sender_address === address ? "Sent" : "Received"}</span>
                            {tx.sender_address === address ? (
                              <> <LocalizedText>to </LocalizedText><span className="font-mono">{tx.token_transfer?.recipient_address?.slice(0, 8)}...{tx.token_transfer?.recipient_address?.slice(-6)}</span></>
                            ) : (
                              <> <LocalizedText>from </LocalizedText><span className="font-mono">{tx.sender_address.slice(0, 8)}...{tx.sender_address.slice(-6)}</span></>
                            )}
                            <span className="ml-2">{tx.token_transfer?.amount ? Number(tx.token_transfer.amount) / 1e6 : ''} <LocalizedText>STX</LocalizedText></span>
                          </>
                        ) : (
                          <span className="text-gray-500">{tx.tx_type.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 text-right whitespace-nowrap">
                      {tx.burn_block_time_iso ? new Date(tx.burn_block_time_iso).toLocaleString() : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
    </div>
    </>
  );
}
