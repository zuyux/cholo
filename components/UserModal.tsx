'use client'


import { LocalizedText } from '@/components/LocalizedText';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Settings, LogOut, User } from 'lucide-react';
import { useWallet } from './WalletProvider';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import { LoaderCircle } from "lucide-react";
import { getPersistedNetwork } from '@/lib/network';
import { getApiUrl } from '@/lib/stacks-api';
import { getProfile, Profile } from '@/lib/profileApi';
import { getIPFSUrl } from '@/lib/pinataUpload';
import SafariOptimizedImage from './SafariOptimizedImage';
import { getSBTCContract } from '@/lib/contracts';

interface UserModalProps {
  onClose: () => void;
}

export default function UserModal({ onClose }: UserModalProps) {
  const { address, setAddress, setWalletType } = useWallet();
  const [sbtcBalance, setSbtcBalance] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usernameLoader, setUsernameLoader] = useState<boolean>(false);
  const router = useRouter();
  const currentAddress = useRef(address).current;
  const modalRef = useRef<HTMLDivElement>(null);
  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch SBTC token balance from Hiro API
  useEffect(() => {
    if (!currentAddress) {
      setSbtcBalance(null);
      return;
    }
    
    const network = getPersistedNetwork();
    const baseApiUrl = getApiUrl(network);
    const apiUrl = `${baseApiUrl}/extended/v1/address/${currentAddress}/balances?unanchored=false`;
    
    const fetchBalance = async () => {
      try {
        const res = await fetch(apiUrl, { method: "GET" });
        const data = await res.json();
        
        // Look for SBTC token in fungible_tokens
        let sbtcTokenBalance = '0';
        
        // The network-aware sBTC token identifier
        const sbtcTokenKey = getSBTCContract();
        
        if (data.fungible_tokens && data.fungible_tokens[sbtcTokenKey]) {
          const balance = data.fungible_tokens[sbtcTokenKey].balance;
          // Show raw balance as Satoshis (no division by 1e8)
          sbtcTokenBalance = Number(balance).toLocaleString();
        } else {
          // Try to find any token that might be sBTC
          const allTokenKeys = Object.keys(data.fungible_tokens || {});
          const sbtcKey = allTokenKeys.find(key => 
            key.toLowerCase().includes('sbtc') || 
            key.includes('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRC9VERC') ||
            key.includes('SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4')
          );
          
          if (sbtcKey) {
            const balance = data.fungible_tokens[sbtcKey].balance;
            sbtcTokenBalance = Number(balance).toLocaleString();
          } else {
            // No sBTC token found; fall through with zero balance
          }
        }
        setSbtcBalance(sbtcTokenBalance);
      } catch (error) {
        console.error('Failed to fetch SBTC balance:', error);
        setSbtcBalance('--');
      }
    };
    fetchBalance();
  }, [currentAddress]);

  // Fetch profile for avatar display
  useEffect(() => {
    if (!currentAddress) {
      setProfile(null);
      setUsernameLoader(false);
      return;
    }
    setUsernameLoader(true);
    const fetchProfile = async () => {
      try {
        const profileData = await getProfile(currentAddress);
        setProfile(profileData);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setProfile(null);
      } finally {
        setUsernameLoader(false);
      }
    };
    fetchProfile();
  }, [currentAddress]);

  const truncateMiddle = (str: string | null) => {
    if (!str) return '';
    if (str.length <= 12) return str;
    return `${str.slice(0, 4)}~${str.slice(-4)}`;
  };

  const getVerifiedEmailUsername = (currentProfile: Profile | null) => {
    if (currentProfile?.email_verified !== true || !currentProfile.email) return '';
    return currentProfile.email.split('@')[0] || '';
  };

  const modalTitle =
    profile?.username ||
    profile?.display_name ||
    getVerifiedEmailUsername(profile) ||
    truncateMiddle(currentAddress);

  const formatBalance = (balanceStr: string | null) => {
    if (!balanceStr || balanceStr === '--') return balanceStr;
    
    // Remove commas and convert to number
    const balance = parseFloat(balanceStr.replace(/,/g, ''));
    
    if (balance >= 1000000000) {
      // Billions
      return `${(balance / 1000000000).toFixed(1)}B`;
    } else if (balance >= 1000000) {
      // Millions
      return `${(balance / 1000000).toFixed(1)}M`;
    } else {
      // Less than a million, return original formatted string
      return balanceStr;
    }
  };

  const clearAllSessions = () => {
    const keysToClear = [
      'cholo_session',
      'cholo_session_config',
      'cholo_session_locked',
      'cholo_encrypted_session',
      'cholo_encrypted_wallet',
      // Clear legacy upstream keys too, so copied CHOLO sessions cannot linger.
      'cholo_session',
      'cholo_session_config',
      'cholo_session_locked',
      'cholo_encrypted_session',
      'cholo_encrypted_wallet',
      'blockstack-session',
      'connect-session',
      'walletAddress',
      'walletType',
    ];
    keysToClear.forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      clearAllSessions();
      window.dispatchEvent(new Event("cholo-session-update"));
    }
    setAddress(null); // Also clear in context
    setWalletType(null);
    onClose();
    // Always route to index after disconnect
    if (router) {
      router.replace('/');
      router.refresh();
    }
    if (typeof window !== "undefined") {
      // Ensure hard navigation as fallback so we always land on index
      setTimeout(() => {
        window.location.replace('/');
      }, 100);
    }
  };

  return (
    <div className="fixed top-7 right-1 z-[200]">
      <div ref={modalRef} className="relative rounded-3xl p-4 w-[340px] flex flex-col items-center shadow-xl pointer-events-auto z-[201] opacity-0 translate-y-[-24px] animate-getinmodal backdrop-blur-md border bg-white dark:bg-black border-gray-200 dark:border-white/20 text-gray-900 dark:text-white">
        <div className="flex items-center w-full mb-6">
          <Link
            href={currentAddress ? `/${currentAddress}` : '/'}
            className="title ml-2 text-left text-gray-900 dark:text-white text-xl font-bold tracking-wider flex-1 cursor-pointer select-none"
            onClick={onClose}
          >
            {usernameLoader ? (
              <LoaderCircle className="animate-spin inline-block align-middle text-black dark:text-white" size={22} />
            ) : modalTitle}
          </Link>
          <div className='flex'>
            <button
              type="button"
              className="w-9 h-9 bg-gradient-to-br from-[#111] to-[#333] border-[1px] border-[#555] rounded-full overflow-hidden cursor-pointer select-none flex items-center justify-center"
              onClick={onClose}
              aria-label={"Profile"}
            >
              {profile?.avatar_cid ? (
                <SafariOptimizedImage
                  src={getIPFSUrl(profile.avatar_cid)}
                  alt="Profile"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  filename="user-avatar.jpg"
                  onError={() => {
                    console.error('Failed to load IPFS avatar with all gateways');
                  }}
                />
              ) : profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Profile"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-gray-400 dark:text-white/60" />
              )}
            </button>
          </div>
        </div>
        <div className="w-full mb-4">
          <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-xl px-6 py-4 mb-2 border border-white/10">
            <button
              onClick={() => { onClose(); router.push('/wallet'); }}
              className="title text-2xl font-bold text-left text-gray-900 dark:text-white hover:underline cursor-pointer select-none"
              style={{ background: "none", border: "none", padding: 0, margin: 0 }}
            >
              {sbtcBalance === null ? (
                <LoaderCircle className="animate-spin text-black dark:text-white inline-block align-middle" size={32} />
              ) : (
                <>
                  {formatBalance(sbtcBalance)} <span className="text-lg"><LocalizedText>SATS</LocalizedText></span>
                </>
              )}
            </button>
            <button
              onClick={() => { onClose(); router.push('/wallet'); }}
              className="text-base text-gray-500 dark:text-white/50 text-right hover:underline cursor-pointer select-none"
              style={{ background: "none", border: "none", padding: 0, margin: 0 }}
            >
              <LocalizedText>Balance
            </LocalizedText></button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full mb-2 font-sans text-base">
          <button
            onClick={() => { onClose(); router.push('/account'); }}
            className="flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm rounded-xl py-4 text-sm text-gray-900 dark:text-white hover:bg-white/7 border border-white/10 cursor-pointer select-none"
          >
            <Settings className="mb-2" size={20} />
            <LocalizedText>Settings
          </LocalizedText></button>
          <button
            className="flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm rounded-xl py-4 text-gray-900 dark:text-white text-sm hover:bg-white/7 border border-white/10 cursor-pointer select-none"
            onClick={handleSignOut}
          >
            <LogOut className="text-gray-900 dark:text-white mb-2" size={20} />
            <LocalizedText>Disconnect
          </LocalizedText></button>
        </div>
      </div>
    </div>
  );
}
