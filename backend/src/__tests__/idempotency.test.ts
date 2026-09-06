import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Idempotency Key Generation & Uniqueness', () => {
  function generateKey(userId: string, senderId: string, recipient: string, subject: string, scheduledTimeMs: number, index: number) {
    return crypto
      .createHash('sha256')
      .update(`${userId}:${senderId}:${recipient}:${subject}:${scheduledTimeMs}:${index}`)
      .digest('hex');
  }

  it('should generate identical idempotency key for identical request attributes', () => {
    const key1 = generateKey('usr_1', 'snd_1', 'test@reachinbox.ai', 'Hello', 1725600000000, 0);
    const key2 = generateKey('usr_1', 'snd_1', 'test@reachinbox.ai', 'Hello', 1725600000000, 0);

    expect(key1).toBe(key2);
  });

  it('should generate distinct keys for different recipients or schedules', () => {
    const key1 = generateKey('usr_1', 'snd_1', 'a@reachinbox.ai', 'Hello', 1725600000000, 0);
    const key2 = generateKey('usr_1', 'snd_1', 'b@reachinbox.ai', 'Hello', 1725600000000, 1);

    expect(key1).not.toBe(key2);
  });
});
