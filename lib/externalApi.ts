export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  backoffFactor?: number;
  timeoutMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  cacheTtlSeconds?: number;
}

interface CachedEntry<T> {
  value: T;
  expiresAt: number;
}

const globalForApiCache = globalThis as unknown as { externalApiCache?: Map<string, CachedEntry<unknown>> };
const externalApiCache = globalForApiCache.externalApiCache ?? (globalForApiCache.externalApiCache = new Map());

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export async function retryAsync<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelay = options.delayMs ?? 500;
  const backoffFactor = options.backoffFactor ?? 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const shouldRetry = options.shouldRetry ? options.shouldRetry(error) : true;
      const canRetry = attempt < attempts && shouldRetry;

      if (!canRetry) break;

      const delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}

export function getCachedValue<T>(key: string): T | undefined {
  const entry = externalApiCache.get(key) as CachedEntry<T> | undefined;
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    externalApiCache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheValue<T>(key: string, value: T, ttlSeconds: number): T {
  externalApiCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return value;
}

export async function withCache<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const cached = getCachedValue<T>(key);
  if (cached !== undefined) return cached;
  const value = await fn();
  return cacheValue(key, value, ttlSeconds);
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: RetryOptions = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 15000;

  return retryAsync(async () => {
    const controller = new AbortController();
    const signal = init.signal ?? controller.signal;
    const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

    try {
      const response = await fetch(input, { ...init, signal });
      if (!response.ok && isRetryableStatus(response.status)) {
        throw new Error(`Retryable fetch failure (${response.status})`);
      }
      return response;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }, {
    attempts: options.attempts,
    delayMs: options.delayMs,
    backoffFactor: options.backoffFactor,
    shouldRetry: options.shouldRetry ?? ((error) => {
      if (error instanceof Error && error.name === 'AbortError') return true;
      return true;
    }),
  });
}

export async function fetchJsonWithRetry<T>(
  url: string,
  init: RequestInit = {},
  options: RetryOptions = {}
): Promise<T> {
  const method = (init.method || 'GET').toString().toUpperCase();
  const cacheable = method === 'GET' && (options.cacheTtlSeconds ?? 0) > 0;
  const cacheKey = `fetchJson:${method}:${url}:${JSON.stringify(init.headers ?? {})}`;

  if (cacheable) {
    const cached = getCachedValue<T>(cacheKey);
    if (cached !== undefined) return cached;
  }

  const response = await fetchWithRetry(url, init, options);
  const result = (await response.json()) as T;

  if (cacheable) {
    cacheValue(cacheKey, result, options.cacheTtlSeconds!);
  }

  return result;
}
