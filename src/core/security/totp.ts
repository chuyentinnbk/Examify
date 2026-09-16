import crypto from 'crypto';
import QRCode from 'qrcode';

// RFC 4648 Base32 alphabet for TOTP
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random RFC 4648 Base32 secret key for Google Authenticator (typically 16-32 chars)
 */
export function generateBase32Secret(byteLength = 20): string {
  const randomBytes = crypto.randomBytes(byteLength);
  let bits = '';
  let result = '';

  for (let i = 0; i < randomBytes.length; i++) {
    bits += randomBytes[i].toString(2).padStart(8, '0');
  }

  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }

  return result;
}

/**
 * Convert Base32 secret string into a raw binary buffer
 */
export function base32ToBuffer(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generate standard RFC 6238 TOTP 6-digit code for a given time step and offset
 */
export function generateTOTP(secret: string, timeStep = 30, windowOffset = 0): string {
  const key = base32ToBuffer(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep) + windowOffset;

  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Verify a 6-digit token submitted by user against their secret.
 * Allows +/- window (default 1 = 30s before or after) to accommodate clock drift.
 */
export function verifyTOTP(secret: string, token: string, window = 1): boolean {
  if (!token) return false;
  const cleanToken = token.trim();
  if (cleanToken.length !== 6) return false;

  for (let offset = -window; offset <= window; offset++) {
    const generated = generateTOTP(secret, 30, offset);
    if (generated === cleanToken) {
      return true;
    }
  }
  return false;
}

/**
 * Build standard otpauth:// URL formatted for Google Authenticator & other TOTP apps
 */
export function getTotpAuthUri(email: string, secret: string, issuer = 'Examify AI'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate high-res base64 Data URL QR code for the otpauth URI
 */
export async function generateQRCodeDataURL(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
