/**
 * Tests for TokenBucket class
 */

import { TokenBucket } from '../token-bucket';

describe('TokenBucket', () => {
  let bucket: TokenBucket;

  beforeEach(() => {
    bucket = new TokenBucket(5);
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
});
