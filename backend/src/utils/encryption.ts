import crypto from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Returns a 32-byte key derived from ENCRYPTION_KEY config
 */
function getKey(): Buffer {
  return crypto.createHash('sha256').update(config.encryptionKey).digest();
}

/**
 * Encrypts plaintext string into base64 payload containing IV, authTag, and ciphertext
 */
export function encryptToken(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // iv (16) + tag (16) + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts base64 payload containing IV, authTag, and ciphertext back to plaintext
 */
export function decryptToken(encryptedBase64: string): string {
  if (!encryptedBase64) return '';
  const buffer = Buffer.from(encryptedBase64, 'base64');
  
  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted payload length');
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext) + decipher.final('utf8');
}
