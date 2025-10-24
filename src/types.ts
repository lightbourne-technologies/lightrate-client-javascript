/**
 * Request types for the LightRate API
 */

export interface ConsumeTokensRequest {
  operation?: string;
  path?: string;
  httpMethod?: string;
  userIdentifier: string;
  tokensRequested: number;
  timestamp?: Date;
  applicationId?: string;
}

/**
 * Response types from the LightRate API
 */

export interface Rule {
  id: string;
  name: string;
  refillRate: number;
  burstRate: number;
  isDefault: boolean;
}

export interface ConsumeTokensResponse {
  tokensRemaining: number;
  tokensConsumed: number;
  throttles: number;
  rule: Rule;
}

export interface ConsumeLocalBucketTokenResponse {
  success: boolean;
  usedLocalToken: boolean;
  bucketStatus: {
    tokensRemaining: number;
    maxTokens: number;
  };
}

/**
 * Configuration types
 */

export interface ClientOptions {
  timeout?: number;
  retryAttempts?: number;
  logger?: any; // Logger interface
  defaultLocalBucketSize?: number;
}

export interface ConfigurationOptions {
  apiKey: string;
  applicationId: string;
  timeout?: number;
  retryAttempts?: number;
  logger?: any;
  defaultLocalBucketSize?: number;
}

/**
 * Token bucket types
 */

export interface TokenBucketStatus {
  tokensRemaining: number;
  maxTokens: number;
}

/**
 * HTTP client types
 */

export interface RequestOptions {
  params?: Record<string, any>;
  body?: any;
}

export interface RetryOptions {
  max: number;
  interval: number;
  backoffFactor: number;
  retryIf: (error: any) => boolean;
}

/**
 * Error types
 */

export interface APIErrorDetails {
  statusCode?: number;
  responseBody?: any;
}
