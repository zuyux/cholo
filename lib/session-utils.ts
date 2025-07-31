import CryptoJS from 'crypto-js';

export interface SessionData {
  stxPrivateKey: string;
  address: string;
  createdAt: number;
  passwordProtected?: boolean;
  passwordHash?: string;
}

export interface PasswordSession {
  isPasswordProtected: boolean;
  requiresPassword: boolean;
  sessionData?: SessionData;
}

/**
 * Check if there's a valid session and if it requires password authentication
 */
export function checkSession(): PasswordSession {
  if (typeof window === "undefined") {
    return { isPasswordProtected: false, requiresPassword: false };
  }

  try {
    const session = localStorage.getItem('kapu_session');
    if (!session) {
      return { isPasswordProtected: false, requiresPassword: false };
    }

    const sessionData: SessionData = JSON.parse(session);
    
    if (sessionData.passwordProtected && sessionData.passwordHash) {
      // Check if password authentication is still valid (you could add expiration logic here)
      const passwordAuthKey = `kapu_password_auth_${sessionData.address}`;
      const passwordAuth = sessionStorage.getItem(passwordAuthKey);
      
      if (!passwordAuth) {
        return { 
          isPasswordProtected: true, 
          requiresPassword: true, 
          sessionData 
        };
      }
      
      // Verify the stored password auth matches the session hash
      try {
        const authData = JSON.parse(passwordAuth);
        if (authData.hash === sessionData.passwordHash) {
          return {
            isPasswordProtected: true,
            requiresPassword: false,
            sessionData
          };
        }
      } catch {
        // Invalid auth data, require password
        sessionStorage.removeItem(passwordAuthKey);
      }
      
      return { 
        isPasswordProtected: true, 
        requiresPassword: true, 
        sessionData 
      };
    }

    // Regular session without password protection
    return {
      isPasswordProtected: false,
      requiresPassword: false,
      sessionData
    };
  } catch {
    return { isPasswordProtected: false, requiresPassword: false };
  }
}

/**
 * Authenticate with password for password-protected session
 */
export function authenticateSession(password: string, sessionData: SessionData): boolean {
  if (!sessionData.passwordHash) {
    return false;
  }

  const passwordHash = CryptoJS.SHA256(password).toString();
  
  if (passwordHash === sessionData.passwordHash) {
    // Store authentication in sessionStorage (expires when browser tab closes)
    const passwordAuthKey = `kapu_password_auth_${sessionData.address}`;
    sessionStorage.setItem(passwordAuthKey, JSON.stringify({
      hash: passwordHash,
      authenticatedAt: Date.now()
    }));
    return true;
  }
  
  return false;
}

/**
 * Clear password authentication (logout)
 */
export function clearPasswordAuth(address: string) {
  if (typeof window !== "undefined") {
    const passwordAuthKey = `kapu_password_auth_${address}`;
    sessionStorage.removeItem(passwordAuthKey);
  }
}

/**
 * Get current authenticated session data
 */
export function getAuthenticatedSession(): SessionData | null {
  const sessionCheck = checkSession();
  
  if (sessionCheck.requiresPassword) {
    return null; // Password required
  }
  
  return sessionCheck.sessionData || null;
}
