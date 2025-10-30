/**
 * Token bucket for local token management
 */

import { TokenBucketStatus } from './types';

export class TokenBucket {
  private availableTokens: number;
  public readonly maxTokens: number;
  public readonly ruleId: string;
  public readonly matcher?: string;
  public readonly httpMethod?: string;
  public readonly userIdentifier: string;
  private lastAccessedAt: Date;
  private lockPromise: Promise<void> | null = null;
  private lockResolve: (() => void) | null = null;

  constructor(
    maxTokens: number,
    ruleId: string,
    userIdentifier: string,
    matcher?: string,
    httpMethod?: string
  ) {
    this.maxTokens = maxTokens;
    this.availableTokens = 0;
    this.ruleId = ruleId;
    this.matcher = matcher;
    this.httpMethod = httpMethod;
    this.userIdentifier = userIdentifier;
    this.lastAccessedAt = new Date();
  }

  /**
   * Check if tokens are available locally (caller must hold lock for thread safety)
   */
  public hasTokens(): boolean {
    return this.availableTokens > 0;
  }

  /**
   * Consume one token from the bucket (caller must hold lock for thread safety)
   * @returns true if token was consumed, false if no tokens available
   */
  public consumeToken(): boolean {
    if (this.availableTokens <= 0) {
      return false;
    }
    
    this.availableTokens -= 1;
    return true;
  }

  /**
   * Consume multiple tokens from the bucket
   * @param count Number of tokens to consume
   * @returns Number of tokens actually consumed
   */
  public consumeTokens(count: number): number {
    if (count <= 0 || this.availableTokens <= 0) {
      return 0;
    }
    
    const tokensToConsume = Math.min(count, this.availableTokens);
    this.availableTokens -= tokensToConsume;
    return tokensToConsume;
  }

  /**
   * Refill the bucket with tokens from the server (caller must hold lock for thread safety)
   * @param tokensToFetch Number of tokens to fetch
   * @returns Number of tokens actually added to the bucket
   */
  public refill(tokensToFetch: number): number {
    this.touch();
    const tokensToAdd = Math.min(tokensToFetch, this.maxTokens - this.availableTokens);
    this.availableTokens += tokensToAdd;
    return tokensToAdd;
  }

  /**
   * Get current bucket status
   */
  public getStatus(): TokenBucketStatus {
    return {
      tokensRemaining: this.availableTokens,
      maxTokens: this.maxTokens
    };
  }

  /**
   * Reset bucket to empty state
   */
  public reset(): void {
    this.availableTokens = 0;
  }

  /**
   * Get the number of available tokens
   */
  public get availableTokensCount(): number {
    return this.availableTokens;
  }

  /**
   * Check if this bucket matches the given request
   * @param operation Optional operation name
   * @param path Optional path
   * @param httpMethod Optional HTTP method
   * @returns true if the bucket matches the request
   */
  public matches(operation?: string, path?: string, httpMethod?: string): boolean {
    // Bucket has expired (not accessed in 60 seconds)
    if (this.expired()) {
      return false;
    }

    if (!this.matcher) {
      return false;
    }

    try {
      // Try to use matcher as regex
      const matcherRegex = new RegExp(this.matcher);

      // For operation-based requests, match against operation
      if (operation) {
        return matcherRegex.test(operation) && !this.httpMethod;
      }

      // For path-based requests, match against path and HTTP method
      if (path) {
        return matcherRegex.test(path) && this.httpMethod === httpMethod;
      }

      return false;
    } catch (e) {
      // If matcher is not a valid regex, fall back to exact match
      if (operation) {
        return this.matcher === operation && !this.httpMethod;
      } else if (path) {
        return this.matcher === path && this.httpMethod === httpMethod;
      }
      return false;
    }
  }

  /**
   * Check if bucket has expired (not accessed in 60 seconds)
   * @returns true if expired
   */
  public expired(): boolean {
    const now = new Date();
    const diffMs = now.getTime() - this.lastAccessedAt.getTime();
    return diffMs > 60000; // 60 seconds
  }

  /**
   * Update last accessed time
   */
  public touch(): void {
    this.lastAccessedAt = new Date();
  }

  /**
   * Check tokens and consume atomically (thread-safe)
   * @returns true if token was consumed, false if no tokens available
   */
  public async checkAndConsumeToken(): Promise<boolean> {
    return this.synchronize(() => {
      this.touch();
      if (this.availableTokens > 0) {
        this.availableTokens -= 1;
        return true;
      }
      return false;
    });
  }

  /**
   * Synchronize access to this bucket for thread-safe operations
   * @param fn Function to execute under bucket lock
   */
  public async synchronize<T>(fn: () => T | Promise<T>): Promise<T> {
    // Wait for any existing lock
    while (this.lockPromise) {
      await this.lockPromise;
    }

    // Acquire lock
    this.lockPromise = new Promise<void>((resolve) => {
      this.lockResolve = resolve;
    });

    try {
      const result = await fn();
      return result;
    } finally {
      // Release lock
      const resolve = this.lockResolve;
      this.lockPromise = null;
      this.lockResolve = null;
      if (resolve) {
        resolve();
      }
    }
  }
}
