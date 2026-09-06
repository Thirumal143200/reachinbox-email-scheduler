import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../utils/encryption.js';

describe('AES-256-GCM Token Encryption', () => {
  it('should encrypt and decrypt a Slack OAuth token correctly', () => {
    const rawToken = 'xoxb-1234567890-9876543210-abcdefghijklmnopqrstuvwx';
    const encrypted = encryptToken(rawToken);

    expect(encrypted).not.toBe(rawToken);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(32);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it('should handle empty token gracefully', () => {
    expect(encryptToken('')).toBe('');
    expect(decryptToken('')).toBe('');
  });

  it('should produce different ciphertexts for the same plaintext due to random IV', () => {
    const token = 'xoxb-sample-token';
    const encrypted1 = encryptToken(token);
    const encrypted2 = encryptToken(token);

    expect(encrypted1).not.toBe(encrypted2);
    expect(decryptToken(encrypted1)).toBe(token);
    expect(decryptToken(encrypted2)).toBe(token);
  });
});
