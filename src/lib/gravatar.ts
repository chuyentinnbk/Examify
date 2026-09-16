/**
 * Gravatar Integration Utilities for Examify
 * Supports SHA-256 hash generation using Web Crypto API and Node.js crypto.
 */

export type GravatarDefault = 'identicon' | 'retro' | 'robohash' | 'monsterid' | 'wavatar' | 'mp' | '404';

export interface GravatarStyleOption {
  id: GravatarDefault;
  label: string;
  description: string;
  icon: string;
}

export const GRAVATAR_STYLES: GravatarStyleOption[] = [
  {
    id: 'identicon',
    label: 'Hình học (Identicon)',
    description: 'Họa tiết hình học đối xứng độc bản theo mã hash email',
    icon: 'grid_view',
  },
  {
    id: 'robohash',
    label: 'Robot (RoboHash)',
    description: 'Hình đại diện người máy thông minh độc đáo',
    icon: 'smart_toy',
  },
  {
    id: 'retro',
    label: 'Pixel Retro (8-bit)',
    description: 'Phong cách đồ họa 8-bit cổ điển Arcade',
    icon: 'videogame_asset',
  },
  {
    id: 'monsterid',
    label: 'Quái vật vui nhộn (MonsterID)',
    description: 'Hình minh họa ngộ nghĩnh sinh động',
    icon: 'sentiment_very_satisfied',
  },
  {
    id: 'mp',
    label: 'Bóng người ẩn danh (Mystery Person)',
    description: 'Biểu tượng người dùng tối giản chuẩn Enterprise',
    icon: 'person',
  },
];

// In-memory cache for computed SHA-256 hashes to prevent recalculating
const hashCache = new Map<string, string>();

/**
 * Computes SHA-256 hash in hex format.
 * Works seamlessly in Browser (Web Crypto API) and Node.js environments.
 */
export async function computeSha256Hex(text: string): Promise<string> {
  const clean = text.trim().toLowerCase();
  if (hashCache.has(clean)) {
    return hashCache.get(clean)!;
  }

  // 1. Browser Web Crypto API
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(clean);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      hashCache.set(clean, hex);
      return hex;
    } catch {
      // Fallback below
    }
  }

  // 2. Node.js Crypto API (if SSR or test)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    const hex = nodeCrypto.createHash('sha256').update(clean).digest('hex');
    hashCache.set(clean, hex);
    return hex;
  } catch {
    // 3. Fallback pure JS if crypto unavailable
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash << 5) - hash + clean.charCodeAt(i);
      hash |= 0;
    }
    const pseudoHex = Math.abs(hash).toString(16).padStart(64, '0');
    return pseudoHex;
  }
}

/**
 * Generates Gravatar image URL with specified size and default fallback pattern.
 */
export async function getGravatarUrl(
  email?: string,
  size = 80,
  defaultType: GravatarDefault = 'identicon'
): Promise<string> {
  if (!email || !email.trim()) {
    return `https://www.gravatar.com/avatar/?d=${defaultType}&s=${size}`;
  }

  const hash = await computeSha256Hex(email);
  return `https://www.gravatar.com/avatar/${hash}?d=${defaultType}&s=${size}`;
}
