'use client';

import { useContext, useState, useEffect } from 'react';
import { HiroWalletContext } from './HiroWalletProvider';
import { Button } from '@/components/ui/button';
import GetInModal from './GetInModal';
import UserModal from './UserModal';
import PasswordAuthModal from './PasswordAuthModal';
import { checkSession, SessionData } from '@/lib/session-utils';

interface GetInButtonProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const GetInButton = (buttonProps: GetInButtonProps) => {
  const { children } = buttonProps;
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGetInModal, setShowGetInModal] = useState(false);
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [isSessionLoggedIn, setIsSessionLoggedIn] = useState(false);
  const [pendingSessionData, setPendingSessionData] = useState<SessionData | null>(null);
  
  // Use the context but with error handling
  const hiroWalletContext = useContext(HiroWalletContext);
  const isWalletConnected = hiroWalletContext?.isWalletConnected || false;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkSessionStatus = () => {
        try {
          const sessionCheck = checkSession();
          
          if (sessionCheck.requiresPassword && sessionCheck.sessionData) {
            // Password-protected session needs authentication
            setPendingSessionData(sessionCheck.sessionData);
            setShowPasswordAuth(true);
            setIsSessionLoggedIn(false);
          } else if (sessionCheck.sessionData && !sessionCheck.requiresPassword) {
            // Valid authenticated session
            setIsSessionLoggedIn(true);
            setShowPasswordAuth(false);
            setPendingSessionData(null);
          } else {
            // No session
            setIsSessionLoggedIn(false);
            setShowPasswordAuth(false);
            setPendingSessionData(null);
          }
        } catch {
          setIsSessionLoggedIn(false);
          setShowPasswordAuth(false);
          setPendingSessionData(null);
        }
      };
      
      checkSessionStatus();
      window.addEventListener('storage', checkSessionStatus);

      // Also listen for route changes to update session state after navigation
      const handleVisibility = () => checkSessionStatus();
      window.addEventListener('visibilitychange', handleVisibility);

      // Listen for session updates
      const handleSessionUpdate = () => checkSessionStatus();
      window.addEventListener('kapu-session-update', handleSessionUpdate);

      return () => {
        window.removeEventListener('storage', checkSessionStatus);
        window.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('kapu-session-update', handleSessionUpdate);
      };
    }
  }, []);

  // Listen for disconnect to update session state
  useEffect(() => {
    if (isWalletConnected && typeof window !== "undefined") {
      const session = localStorage.getItem('kapu_session');
      if (!session) setIsSessionLoggedIn(false);
    }
  }, [isWalletConnected]);

  // Also update session state when modal closes (for immediate UI update after login)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkSession = () => {
        const session = localStorage.getItem('kapu_session');
        setIsSessionLoggedIn(!!session);
      };
      // Listen for custom event after login
      window.addEventListener('kapu-session-update', checkSession);
      return () => window.removeEventListener('kapu-session-update', checkSession);
    }
  }, []);

  if (isSessionLoggedIn) {
    return (
      <div className='fixed top-8 right-8 z-[100]'>
        <button
          type="button"
          className="w-9 h-9 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full p-4 cursor-pointer select-none"
          onClick={() => setShowUserModal(true)}
          aria-label="Profile"
        >
        </button>
        {showUserModal && <UserModal onClose={() => setShowUserModal(false)} />}
      </div>
    );
  }

  // Only show the GetInModal button, remove the connect wallet button
  return (
    <>
      <div className='fixed top-6 right-6 z-[100]'>
        <Button
          onClick={() => setShowGetInModal(true)}
          className="title rounded-full px-6 py-5 text-sm bg-[#E9E9E9] hover:bg-black text-black hover:text-white border-2 border-black hover:border-2 hover:border-white cursor-pointer select-none"
          {...buttonProps}
        >
          {children || 'GET IN'}
        </Button>
      </div>
      {showGetInModal && <GetInModal onClose={() => setShowGetInModal(false)} />}
      {showPasswordAuth && pendingSessionData && (
        <PasswordAuthModal
          sessionData={pendingSessionData}
          onSuccess={() => {
            setShowPasswordAuth(false);
            setPendingSessionData(null);
            setIsSessionLoggedIn(true);
            window.dispatchEvent(new Event('kapu-session-update'));
          }}
          onClose={() => {
            setShowPasswordAuth(false);
            setPendingSessionData(null);
          }}
        />
      )}
    </>
  );
};
