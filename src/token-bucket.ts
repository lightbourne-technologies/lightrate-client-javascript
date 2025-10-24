/**
 * Token bucket for local token management
 */

import { TokenBucketStatus } from './types';

export class TokenBucket {
  private availableTokens: number;
  public readonly maxTokens: number;

  constructor(maxTokens: number) {
    this.maxTokens = maxTokens;
    this.availableTokens = 0;
  }

  /**
   * Check if tokens are available locally
   */
  public hasTokens(): boolean {
    return this.availableTokens > 0;
  }

  /**
   * Consume one token from the bucket
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
   * Refill the bucket with tokens from the server
   * @param tokensToFetch Number of tokens to fetch
   * @returns Number of tokens actually added to the bucket
   */
  public refill(tokensToFetch: number): number {
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
}
