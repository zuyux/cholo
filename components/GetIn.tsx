'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { Button } from '@/components/ui/button';
import GetInModal from './GetInModal';
import UserModal from './UserModal';
import { User } from 'lucide-react';
import Image from 'next/image';
import { getProfile, Profile } from '@/lib/profileApi';
import { getIPFSUrl } from '@/lib/pinataUpload';

interface GetInButtonProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const GetInButton = (buttonProps: GetInButtonProps) => {
  const { children } = buttonProps;
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGetInModal, setShowGetInModal] = useState(false);
  const [isSessionLoggedIn, setIsSessionLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const currentAddress = useCurrentAddress();
  // isWalletConnected is true if a wallet address is present
  const isWalletConnected = !!currentAddress;
  const { isAuthenticated: isEncryptedAuthenticated } = useEncryptedWallet();
  const router = useRouter();

  // Redirect to home after wallet connection
  useEffect(() => {
    if (isWalletConnected) {
      router.push('/');
    }
  }, [isWalletConnected, router]);

  // Get current address from session or wallet
  // currentAddress is now always up-to-date from useCurrentAddress

  // Load profile when address changes
  useEffect(() => {
    if (!currentAddress) {
      setProfile(null);
      return;
    }
    
    const fetchProfile = async () => {
      try {
        const profileData = await getProfile(currentAddress);
        setProfile(profileData);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setProfile(null);
      }
    };
    
    fetchProfile();
  }, [currentAddress]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkSession = () => {
        try {
          const session = localStorage.getItem('4v4_session');
          const hasSession = !!session;
          console.log('Session check after cleanup:', hasSession, session); // Debug log
          setIsSessionLoggedIn(hasSession);
        } catch {
          setIsSessionLoggedIn(false);
        }
      };
      
      // Initial check (after cleanup)
      setTimeout(checkSession, 100); // Small delay to ensure cleanup completed
      
      // Listen for storage changes
      window.addEventListener('storage', checkSession);

      // Also listen for route changes to update session state after navigation
      const handleVisibility = () => checkSession();
      window.addEventListener('visibilitychange', handleVisibility);

      // Listen for custom event after login
      window.addEventListener('4v4-session-update', checkSession);

      return () => {
        window.removeEventListener('storage', checkSession);
        window.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('4v4-session-update', checkSession);
      };
    }
  }, []);

  // Listen for disconnect to update session state
  useEffect(() => {
    if (!isWalletConnected) {
      const session = localStorage.getItem('4v4_session');
      if (!session) setIsSessionLoggedIn(false);
    }
  }, [isWalletConnected]);

  return (
    <>
  {(isSessionLoggedIn || isWalletConnected || isEncryptedAuthenticated) ? (
        <div className='fixed top-0 right-0 p-0 md:p-0 z-100 hidden md:block'>
          <button
            type="button"
            className="w-10 sm:w-12 md:w-14 h-10 sm:h-12 md:h-14
              border-2 border-white/20 hover:border-white
              bg-black rounded-lg overflow-hidden 
              cursor-pointer select-none 
              transition-all duration-200 
              flex items-center jx-4 md:px-ustify-center
              shadow-lg hover:shadow-xl"
            onClick={() => setShowUserModal(true)}
            aria-label="Profile"
          >
            {profile?.avatar_cid ? (
              <img
                src={getIPFSUrl(profile.avatar_cid)}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to User icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = parent.querySelector('.fallback-icon');
                    if (fallback) fallback.classList.remove('hidden');
                  }
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
              <User className="w-4 h-4 text-white/60" />
            )}
            {/* Fallback icon for IPFS load errors */}
            <User className="w-4 h-4 text-white/60 fallback-icon hidden" />
          </button>
          {showUserModal && <UserModal onClose={() => setShowUserModal(false)} />}
        </div>
      ) : (
        <div className='fixed top-0 right-0 p-0 md:p-0 z-100 hidden md:block'>
          <Button
            onClick={() => setShowGetInModal(true)}
            size="lg"
            className="title bg-black text-foreground 
              px-4 sm:px-6 md:px-8 lg:px-10
              py-2 sm:py-3 md:py-4 lg:py-6
              text-2xl sm:text-3xl md:text-4xl lg:text-5xl
              font-bold transition-all duration-200 
              hover:bg-white hover:text-black
              border-2 border-white/20 hover:border-white
              rounded-lg shadow-lg
              cursor-pointer"
            {...buttonProps}
          >
            {children || 'ENTRA'}
          </Button>
        </div>
      )}
      {showGetInModal && <GetInModal onClose={() => setShowGetInModal(false)} />}
    </>
  );
};
