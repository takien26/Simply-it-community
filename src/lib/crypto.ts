// src/lib/crypto.ts
// SIMPLY IT — AES-256-GCM Encryption at Rest for Password Vault
// ponytail: Uses Node.js native crypto; zero external dependencies.

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getMasterKey(): Buffer {
  const secret =
    process.env.PASSWORD_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'simply-it-vault-master-key';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encrypt(text: string): string {
  if (!text) return '';
  // Avoid double encryption if text is already encrypted
  if (text.startsWith(PREFIX)) return text;

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * If the string does not have the prefix (e.g. legacy unencrypted plaintext),
 * it returns the original string gracefully for backward compatibility.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';
  if (!ciphertext.startsWith(PREFIX)) {
    // Backward compatibility: existing unencrypted legacy data
    return ciphertext;
  }

  try {
    const raw = ciphertext.slice(PREFIX.length);
    const parts = raw.split(':');
    if (parts.length !== 3) {
      return ciphertext;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn('[Crypto] Decryption failed for cipher text (tampered or wrong key):', err);
    return '[Lỗi giải mã]';
  }
}

export function encryptOptional(text: string | null | undefined): string | null {
  if (text === null || text === undefined || text === '') return null;
  return encrypt(text);
}

export function decryptOptional(text: string | null | undefined): string | null {
  if (text === null || text === undefined || text === '') return null;
  return decrypt(text);
}
