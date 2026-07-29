/**
 * IPFS URL utilities for Safari/iOS compatibility
 */

// List of IPFS gateways with strong Safari/iOS compatibility
export const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/',
] as const;

/**
 * Extracts the IPFS hash from any IPFS URL
 */
export function extractIPFSHash(url: string): string | null {
  // Patterns for the different IPFS URL formats
  const patterns = [
    /\/ipfs\/([a-zA-Z0-9]+)/,
    /ipfs:\/\/([a-zA-Z0-9]+)/,
    /^([a-zA-Z0-9]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Converts any IPFS URL into a Safari/iOS-optimized URL
 */
export function optimizeIPFSUrl(url: string, filename?: string): string {
  const hash = extractIPFSHash(url);
  
  if (!hash) {
    console.warn('Could not extract IPFS hash from URL:', url);
    return url;
  }

  // Prefer our proxy API first on Safari/iOS
  if (typeof window !== 'undefined' && isSafariOrIOS()) {
    return `/api/ipfs-proxy?hash=${hash}&filename=${filename || 'sbtc-image.png'}`;
  }

  // Use the primary gateway for other browsers
  const baseUrl = `${IPFS_GATEWAYS[0]}${hash}`;

  if (!filename) {
    return baseUrl;
  }

  const params = new URLSearchParams();
  params.set('filename', filename);

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generates backup IPFS URLs if the primary gateway fails
 */
export function generateFallbackUrls(url: string, filename?: string): string[] {
  const hash = extractIPFSHash(url);
  
  if (!hash) {
    return [url];
  }

  const urls: string[] = [];
  
  // Prioritize our proxy on Safari/iOS
  if (typeof window !== 'undefined' && isSafariOrIOS()) {
    urls.push(`/api/ipfs-proxy?hash=${hash}&filename=${filename || 'sbtc-image.png'}`);
  }

  // Append direct gateway URLs
  IPFS_GATEWAYS.forEach(gateway => {
    const baseUrl = `${gateway}${hash}`;
    const params = new URLSearchParams();
    
    if (filename) {
      params.set('filename', filename);
    }
    
    urls.push(`${baseUrl}?${params.toString()}`);
  });

  return urls;
}

/**
 * Image preload with automatic iOS fallback
 */
export function preloadImageWithFallback(url: string, filename?: string): Promise<string> {
  const fallbackUrls = generateFallbackUrls(url, filename);
  
  return new Promise((resolve, reject) => {
    let currentIndex = 0;
    
    function tryNextUrl() {
      if (currentIndex >= fallbackUrls.length) {
        reject(new Error('All IPFS gateways failed'));
        return;
      }
      
      const currentUrl = fallbackUrls[currentIndex];
      const img = new Image();
      
      img.onload = () => {
        resolve(currentUrl);
      };
      
      img.onerror = () => {
        console.warn(`IPFS gateway failed: ${currentUrl}`);
        currentIndex++;
        tryNextUrl();
      };
      
      // Configure CORS and other props for iOS
      img.crossOrigin = 'anonymous';
      img.loading = 'eager';
      img.src = currentUrl;
    }
    
    tryNextUrl();
  });
}

/**
 * Detects whether the user is on Safari/iOS
 */
export function isSafariOrIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  
  return isSafari || isIOS;
}

/**
 * Converts every URL in an array for Safari compatibility
 */
export function optimizeImageUrls(urls: string[]): string[] {
  return urls.map((url, index) => 
    optimizeIPFSUrl(url, `sbtc-${index + 1}.png`)
  );
}