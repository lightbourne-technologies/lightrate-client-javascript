/**
 * Tests for TokenBucket class
 */

import { TokenBucket } from '../token-bucket';

describe('TokenBucket', () => {
  let bucket: TokenBucket;

  beforeEach(() => {
    bucket = new TokenBucket(5, 'test_rule_id', 'test_user');
  });

  describe('constructor', () => {
    it('should initialize with correct max tokens', () => {
      expect(bucket.maxTokens).toBe(5);
      expect(bucket.availableTokensCount).toBe(0);
    });
  });

  describe('hasTokens', () => {
    it('should return false when no tokens available', () => {
      expect(bucket.hasTokens()).toBe(false);
    });

    it('should return true when tokens are available', () => {
      bucket.refill(3);
      expect(bucket.hasTokens()).toBe(true);
    });
  });

  describe('consumeToken', () => {
    it('should return false when no tokens available', () => {
      expect(bucket.consumeToken()).toBe(false);
    });

    it('should consume one token and return true', () => {
      bucket.refill(3);
      expect(bucket.consumeToken()).toBe(true);
      expect(bucket.availableTokensCount).toBe(2);
    });

    it('should not consume more tokens than available', () => {
      bucket.refill(1);
      expect(bucket.consumeToken()).toBe(true);
      expect(bucket.consumeToken()).toBe(false);
      expect(bucket.availableTokensCount).toBe(0);
    });
  });

  describe('consumeTokens', () => {
    it('should return 0 when no tokens available', () => {
      expect(bucket.consumeTokens(3)).toBe(0);
    });

    it('should return 0 when requesting 0 or negative tokens', () => {
      bucket.refill(3);
      expect(bucket.consumeTokens(0)).toBe(0);
      expect(bucket.consumeTokens(-1)).toBe(0);
    });

    it('should consume requested tokens when available', () => {
      bucket.refill(5);
      expect(bucket.consumeTokens(3)).toBe(3);
      expect(bucket.availableTokensCount).toBe(2);
    });

    it('should consume only available tokens when requesting more than available', () => {
      bucket.refill(2);
      expect(bucket.consumeTokens(5)).toBe(2);
      expect(bucket.availableTokensCount).toBe(0);
    });
  });

  describe('refill', () => {
    it('should add tokens up to max capacity', () => {
      expect(bucket.refill(3)).toBe(3);
      expect(bucket.availableTokensCount).toBe(3);
    });

    it('should not exceed max capacity', () => {
      bucket.refill(3);
      expect(bucket.refill(5)).toBe(2); // Only 2 more can be added
      expect(bucket.availableTokensCount).toBe(5);
    });

    it('should return 0 when bucket is already full', () => {
      bucket.refill(5);
      expect(bucket.refill(3)).toBe(0);
      expect(bucket.availableTokensCount).toBe(5);
    });
  });

  describe('getStatus', () => {
    it('should return correct status', () => {
      bucket.refill(3);
      const status = bucket.getStatus();
      expect(status).toEqual({
        tokensRemaining: 3,
        maxTokens: 5
      });
    });
  });

  describe('reset', () => {
    it('should reset tokens to 0', () => {
      bucket.refill(5);
      bucket.reset();
      expect(bucket.availableTokensCount).toBe(0);
    });
  });

  describe('expiration', () => {
    const now = new Date('2025-01-01T00:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
      // fresh bucket per test with deterministic time
      bucket = new TokenBucket(5, 'rule_expire', 'user_expire', 'send_email');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not be expired immediately after creation', () => {
      expect(bucket.expired()).toBe(false);
    });

    it('should expire after 60 seconds of inactivity', () => {
      // Access bucket to ensure lastAccessedAt is now
      bucket.refill(1);
      expect(bucket.expired()).toBe(false);

      // Advance time by 61 seconds
      jest.setSystemTime(new Date(now.getTime() + 61_000));
      expect(bucket.expired()).toBe(true);
    });

    it('touch should prevent expiration if activity within 60 seconds', async () => {
      bucket.refill(1);
      // Advance 59 seconds, still not expired
      jest.setSystemTime(new Date(now.getTime() + 59_000));
      expect(bucket.expired()).toBe(false);

      // Activity updates lastAccessedAt (checkAndConsumeToken touches the bucket)
      await bucket.checkAndConsumeToken();

      // Advance another 59 seconds from the last activity
      jest.setSystemTime(new Date(now.getTime() + 118_000));
      expect(bucket.expired()).toBe(false);

      // Advance to >60s since last activity
      jest.setSystemTime(new Date(now.getTime() + 121_000));
      expect(bucket.expired()).toBe(true);
    });

    it('should not match after expiration', () => {
      // Initially matcher should work
      expect(bucket.matches('send_email')).toBe(true);

      // After 61s, bucket should be expired and not match
      jest.setSystemTime(new Date(now.getTime() + 61_000));
      expect(bucket.matches('send_email')).toBe(false);
    });
  });
});
