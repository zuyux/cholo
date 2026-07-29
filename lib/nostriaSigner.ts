import { encodeNostrPublicKey } from '@/lib/albyWallet';

type NostrEventTemplate = {
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
};

type NostrSignedEvent = NostrEventTemplate & {
  id?: string;
  pubkey?: string;
  sig?: string;
};

type NostriaProviderResponse<T> = {
  response?: T;
};

export type NostriaProvider = {
  name?: string;
  request?: (request: { method: string; params?: unknown[] }) => Promise<NostriaProviderResponse<unknown> | unknown>;
};

type VerifiedNostrSignedEvent = NostrSignedEvent & {
  sig: string;
};

export type NostriaSignerConnection = {
  address: string;
  publicKeyHex: string;
  authEvent?: VerifiedNostrSignedEvent;
};

const NOSTR_PUBLIC_KEY_HEX_REGEX = /^[0-9a-fA-F]{64}$/;
const NOSTRIA_EXTENSION_ID = 'nostria';

const createRequestId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getNostriaProvider = (): NostriaProvider | undefined => {
  if (typeof window === 'undefined') return undefined;
  const browserWindow = window as typeof window & {
    nostria?: NostriaProvider;
    blockcore?: NostriaProvider;
  };
  const provider = browserWindow.nostria ?? browserWindow.blockcore;
  return typeof provider?.request === 'function' ? provider : undefined;
};

export const isNostriaSignerAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  const provider = getNostriaProvider();
  return typeof provider?.request === 'function';
};

const normalizePublicKey = (publicKey: string): string => {
  const normalized = publicKey.trim().toLowerCase();
  if (!NOSTR_PUBLIC_KEY_HEX_REGEX.test(normalized)) {
    throw new Error('Nostria Signer returned an invalid Nostr public key.');
  }
  return normalized;
};

const buildAuthEvent = (): NostrEventTemplate => ({
  created_at: Math.floor(Date.now() / 1000),
  kind: 27235,
  tags: [
    ['client', 'BBOX'],
    ['challenge', `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`],
  ],
  content: JSON.stringify({
    action: 'bbox_auth',
    origin: typeof window !== 'undefined' ? window.location.origin : 'bbox',
  }),
});

const unwrapNostriaResponse = <T>(result: NostriaProviderResponse<T> | T): T => {
  if (result && typeof result === 'object' && 'response' in result) {
    return (result as NostriaProviderResponse<T>).response as T;
  }
  return result as T;
};

const waitForNostriaProvider = async (timeoutMs = 1500): Promise<NostriaProvider | undefined> => {
  const startedAt = Date.now();
  let provider = getNostriaProvider();

  while (!provider && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, 100));
    provider = getNostriaProvider();
  }

  return provider;
};

const requestViaNostriaContentScript = async (
  request: { method: string; params?: unknown[] },
  timeoutMs = 12000
): Promise<NostriaProviderResponse<unknown>> => {
  if (typeof window === 'undefined') {
    throw new Error('Nostria Signer can only be connected in the browser.');
  }

  const id = createRequestId();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error('Nostria Signer did not respond. Make sure the extension is enabled for this site, then refresh and try again.'));
    }, timeoutMs);

    function handleMessage(message: MessageEvent) {
      if (message.source !== window) return;
      const data = message.data as {
        id?: string;
        ext?: string;
        target?: string;
        response?: {
          error?: { message?: string; stack?: string };
          response?: unknown;
        };
      };

      if (!data || data.id !== id || data.ext !== NOSTRIA_EXTENSION_ID || data.target !== 'provider' || !data.response) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);

      if (data.response.error) {
        const error = new Error(data.response.error.message || 'Nostria Signer rejected the request.');
        error.stack = data.response.error.stack;
        reject(error);
        return;
      }

      resolve(data.response);
    }

    window.addEventListener('message', handleMessage);
    window.postMessage(
      {
        type: 'request',
        id,
        request,
        source: 'provider',
        target: 'tabs',
        ext: NOSTRIA_EXTENSION_ID,
      },
      window.location.origin
    );
  });
};

const requestNostria = async (request: { method: string; params?: unknown[] }) => {
  const provider = await waitForNostriaProvider();
  if (provider?.request) {
    try {
      return await provider.request(request);
    } catch (error) {
      console.warn('Nostria injected provider request failed, trying content-script bridge.', error);
    }
  }

  return requestViaNostriaContentScript(request);
};

export const getNostriaPublicKey = async (): Promise<string> => {
  const result = await requestNostria({ method: 'nostr.publickey', params: [{}] });
  const publicKey = unwrapNostriaResponse<string>(result as string | NostriaProviderResponse<string>);
  if (typeof publicKey !== 'string') {
    throw new Error('Nostria Signer returned an invalid Nostr public key.');
  }

  return normalizePublicKey(publicKey);
};

export const signNostriaEvent = async (event: NostrEventTemplate): Promise<VerifiedNostrSignedEvent> => {
  const result = await requestNostria({ method: 'nostr.signevent', params: [event] });
  const signedEvent = unwrapNostriaResponse<NostrSignedEvent>(result as NostrSignedEvent | NostriaProviderResponse<NostrSignedEvent>);
  if (!signedEvent?.sig) {
    throw new Error('Nostria Signer returned an invalid signature payload');
  }

  return signedEvent as VerifiedNostrSignedEvent;
};

export const connectNostriaSigner = async (): Promise<NostriaSignerConnection> => {
  if (typeof window === 'undefined') {
    throw new Error('Nostria Signer can only be connected in the browser.');
  }

  const publicKeyHex = await getNostriaPublicKey();
  const authEvent = await signNostriaEvent(buildAuthEvent());

  return {
    address: encodeNostrPublicKey(publicKeyHex),
    publicKeyHex,
    authEvent,
  };
};
