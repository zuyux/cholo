'use client';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccounts = {
  id: {
    initialize: (options: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
      cancel_on_tap_outside?: boolean;
      ux_mode?: 'popup' | 'redirect';
    }) => void;
    renderButton: (
      parent: HTMLElement,
      options: {
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'large' | 'medium' | 'small';
        type?: 'standard' | 'icon';
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        logo_alignment?: 'left' | 'center';
        width?: string | number;
      }
    ) => void;
  };
};

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts;
    };
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google solo esta disponible en el navegador.'));
  }

  if (window.google?.accounts?.id) return Promise.resolve();

  const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Google.')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google.'));
    document.head.appendChild(script);
  });
}

export async function renderGoogleSignInButton(
  parent: HTMLElement,
  onCredential: (credential: string) => void,
  onError: (error: Error) => void
) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    onError(new Error('El inicio con Google no esta configurado.'));
    return;
  }

  try {
    await loadGoogleIdentityScript();
  } catch (error) {
    onError(error instanceof Error ? error : new Error('No se pudo cargar Google.'));
    return;
  }

  const googleId = window.google?.accounts?.id;
  if (!googleId) {
    onError(new Error('Google no esta disponible.'));
    return;
  }

  parent.replaceChildren();
  googleId.initialize({
    client_id: clientId,
    ux_mode: 'popup',
    cancel_on_tap_outside: true,
    callback: (response) => {
      if (response.credential) onCredential(response.credential);
      else onError(new Error('Google no devolvio una credencial.'));
    },
  });
  googleId.renderButton(parent, {
    theme: 'outline',
    size: 'large',
    type: 'standard',
    shape: 'rectangular',
    text: 'continue_with',
    logo_alignment: 'left',
    width: Math.max(parent.offsetWidth, 240),
  });
}
