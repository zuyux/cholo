export function getWalletErrorMessage(error: unknown, fallback = 'An unknown wallet error occurred'): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error || fallback;
  if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;

    const nestedError = (error as { error?: unknown }).error;
    if (typeof nestedError === 'string' && nestedError.trim()) return nestedError;
    if (typeof nestedError === 'object' && nestedError !== null) {
      const nestedMessage = (nestedError as { message?: unknown }).message;
      if (typeof nestedMessage === 'string' && nestedMessage.trim()) return nestedMessage;
    }

    const dataError = (error as { data?: unknown }).data;
    if (typeof dataError === 'string' && dataError.trim()) return dataError;
    if (typeof dataError === 'object' && dataError !== null) {
      const dataMessage = (dataError as { message?: unknown }).message;
      if (typeof dataMessage === 'string' && dataMessage.trim()) return dataMessage;
    }

    const code = (error as { code?: unknown }).code;
    if (typeof code === 'number' || typeof code === 'string') {
      return `Wallet error code: ${code}`;
    }

    try {
      const json = JSON.stringify(error);
      if (json && json !== '{}' && json !== 'null') return json;
    } catch {
      // ignore serialization failures
    }
  }

  return fallback;
}

export function isWalletRequestCancelled(error: unknown): boolean {
  const message = getWalletErrorMessage(error, '').toLowerCase();
  return /cancel|cancelled|reject|rejected|denied|user.*closed|popup.*closed/.test(message);
}
