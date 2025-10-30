/**
 * Main LightRate client class
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Configuration } from './configuration';
import { TokenBucket } from './token-bucket';
import {
  ConsumeTokensRequest,
  ConsumeTokensResponse,
  ConsumeLocalBucketTokenResponse,
  ClientOptions,
  RequestOptions,
  Rule
} from './types';
import {
  ConfigurationError,
  NetworkError,
  TimeoutError,
  createErrorFromResponse
} from './errors';

const VERSION = '1.0.0';

export class LightRateClient {
  private configuration: Configuration;
  private tokenBuckets: Map<string, TokenBucket>;
  private axiosInstance!: AxiosInstance;
  private bucketsLockPromise: Promise<void> | null = null;
  private bucketsLockResolve: (() => void) | null = null;

  constructor(apiKey: string, applicationId: string, options: ClientOptions = {}) {
    // Initialize configuration
    if (apiKey && applicationId) {
      this.configuration = new Configuration({
        apiKey,
        applicationId,
        timeout: options.timeout,
        retryAttempts: options.retryAttempts,
        logger: options.logger,
        defaultLocalBucketSize: options.defaultLocalBucketSize,
      });
    } else {
      // Use global configuration
      this.configuration = new Configuration();
    }

    this.tokenBuckets = new Map();
    
    this.validateConfiguration();
    this.setupAxiosInstance();
  }

  /**
   * Consume tokens by operation or path using local bucket
   */
  public async consumeLocalBucketToken(
    userIdentifier: string,
    operation?: string,
    path?: string,
    httpMethod?: string
  ): Promise<ConsumeLocalBucketTokenResponse> {
    // First, try to find an existing bucket that matches this request
    const bucket = await this.findBucketByMatcher(userIdentifier, operation, path, httpMethod);

    if (bucket) {
      // Use bucket's lock to synchronize the check and consume
      const consumed = await bucket.checkAndConsumeToken();
      if (consumed) {
        return {
          success: true,
          usedLocalToken: true,
          bucketStatus: bucket.getStatus()
        };
      }
    }

    // Still empty, make API call while holding the lock
    const tokensToFetch = this.configuration.defaultLocalBucketSize;
    const request: ConsumeTokensRequest = {
      operation,
      path,
      httpMethod,
      userIdentifier,
      tokensRequested: tokensToFetch,
      tokensRequestedForDefaultBucketMatch: 1,
      timestamp: new Date(),
      applicationId: this.configuration.applicationId
    };

    const response = await this.consumeTokensWithRequest(request);

    if (response.rule.isDefault) {
      return {
        success: response.tokensConsumed > 0,
        usedLocalToken: false,
        bucketStatus: null as any
      };
    }

    console.log('getting new tokens', response);

    const newBucket = await this.fillBucketAndCreateIfNotExists(userIdentifier, response.rule, response.tokensConsumed);

    const newBucketTokensAvailable = await newBucket.checkAndConsumeToken();

    console.log('new bucket tokens available', newBucketTokensAvailable);

    return {
      success: newBucketTokensAvailable,
      usedLocalToken: false,
      bucketStatus: newBucket.getStatus()
    };
  }


  private async fetchTokensAndCreateBucket(
    userIdentifier: string,
    operation: string | undefined,
    path: string | undefined,
    httpMethod: string | undefined
  ): Promise<ConsumeLocalBucketTokenResponse> {
    const tokensToFetch = this.configuration.defaultLocalBucketSize;
    
    const request: ConsumeTokensRequest = {
      operation,
      path,
      httpMethod,
      userIdentifier,
      tokensRequested: tokensToFetch,
      tokensRequestedForDefaultBucketMatch: 1,
      timestamp: new Date(),
      applicationId: this.configuration.applicationId
    };

    try {
      const response = await this.consumeTokensWithRequest(request);

      // If this is a default bucket, don't create a local bucket
      if (response.rule.isDefault) {
        return {
          success: response.tokensConsumed > 0,
          usedLocalToken: false,
          bucketStatus: null as any // TypeScript compatibility
        };
      }

      // Create or get bucket for this rule (synchronized)
      const newBucket = await this.fillBucketAndCreateIfNotExists(userIdentifier, response.rule, response.tokensConsumed);
      
      // CheckAndCreateBucket refills the bucket, now consume a token atomically
      const tokensAvailable = await newBucket.checkAndConsumeToken();

      return {
        success: tokensAvailable,
        usedLocalToken: false,
        bucketStatus: newBucket.getStatus()
      };
    } catch (error) {
      return {
        success: false,
        usedLocalToken: false,
        bucketStatus: null as any
      };
    }
  }

  /**
   * Consume tokens directly from API
   */
  public async consumeTokens(
    userIdentifier: string,
    tokensRequested: number,
    operation?: string,
    path?: string,
    httpMethod?: string
  ): Promise<ConsumeTokensResponse> {
    const request: ConsumeTokensRequest = {
      operation,
      path,
      httpMethod,
      userIdentifier,
      tokensRequested,
      tokensRequestedForDefaultBucketMatch: 1,
      timestamp: new Date(),
      applicationId: this.configuration.applicationId
    };

    return this.consumeTokensWithRequest(request);
  }

  /**
   * Consume tokens using a request object
   */
  public async consumeTokensWithRequest(request: ConsumeTokensRequest): Promise<ConsumeTokensResponse> {
    if (!this.isValidConsumeTokensRequest(request)) {
      throw new Error('Invalid request: validation failed');
    }

    const response = await this.post('/api/v1/tokens/consume', request);
    return this.parseConsumeTokensResponse(response);
  }

  /**
   * Get all bucket statuses
   */
  public getAllBucketStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    for (const [key, bucket] of this.tokenBuckets.entries()) {
      statuses[key] = bucket.getStatus();
    }
    return statuses;
  }

  /**
   * Reset all token buckets
   */
  public resetAllBuckets(): void {
    this.tokenBuckets.clear();
  }

  /**
   * Get configuration
   */
  public getConfiguration(): Configuration {
    return this.configuration;
  }

  private async findBucketByMatcher(
    userIdentifier: string,
    operation?: string,
    path?: string,
    httpMethod?: string
  ): Promise<TokenBucket | null> {
    return this.synchronizeBucketsMap(() => {
      // Iterate through buckets to find one that matches this user and request
      for (const bucket of this.tokenBuckets.values()) {
        if (bucket.matches(operation, path, httpMethod) && bucket.userIdentifier === userIdentifier) {
          return bucket;
        }
      }
      return null;
    });
  }

  private async fillBucketAndCreateIfNotExists(
    userIdentifier: string,
    rule: Rule,
    tokenCount: number
  ): Promise<TokenBucket> {
    const bucketKey = `${userIdentifier}:rule:${rule.id}`;
    
    // Synchronize on the buckets map to ensure only one request creates a bucket
    return this.synchronizeBucketsMap(async () => {
      // Check if bucket exists and has tokens
      if (!this.tokenBuckets.get(bucketKey)) {
        const bucket = new TokenBucket(
          this.configuration.defaultLocalBucketSize,
          rule.id,
          userIdentifier,
          rule.matcher,
          rule.httpMethod
        );
        this.tokenBuckets.set(bucketKey, bucket);
      }

      const bucket = this.tokenBuckets.get(bucketKey) as TokenBucket;
      
      await bucket.synchronize(() => {
        bucket.refill(tokenCount);
      });

      return bucket;
    });
  }

  /**
   * Synchronize access to the buckets map for thread-safe operations
   * @param fn Function to execute under lock
   */
  private async synchronizeBucketsMap<T>(fn: () => T | Promise<T>): Promise<T> {
    // Wait for any existing lock
    while (this.bucketsLockPromise) {
      await this.bucketsLockPromise;
    }

    // Acquire lock
    this.bucketsLockPromise = new Promise<void>((resolve) => {
      this.bucketsLockResolve = resolve;
    });

    try {
      const result = await fn();
      return result;
    } finally {
      // Release lock
      const resolve = this.bucketsLockResolve;
      this.bucketsLockPromise = null;
      this.bucketsLockResolve = null;
      if (resolve) {
        resolve();
      }
    }
  }

  private validateConfiguration(): void {
    if (!this.configuration.isValid()) {
      throw new ConfigurationError('API key and application ID are required');
    }
  }

  private setupAxiosInstance(): void {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.lightrate.lightbournetechnologies.ca',
      timeout: this.configuration.timeout * 1000, // Convert to milliseconds
      headers: {
        'Authorization': `Bearer ${this.configuration.apiKey}`,
        'User-Agent': `lightrate-client-javascript/${VERSION}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(this.configuration.applicationId ? { 'X-Application-Id': this.configuration.applicationId } : {})
      }
    });

    // Add request interceptor for logging
    if (this.configuration.logger) {
      this.axiosInstance.interceptors.request.use(
        (config) => {
          this.configuration.logger?.info('Making request', {
            method: config.method,
            url: config.url,
            params: config.params
          });
          return config;
        }
      );
    }

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNABORTED') {
          throw new TimeoutError(`Request timed out after ${this.configuration.timeout} seconds`);
        }
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new NetworkError(`Network error: ${error.message}`);
        }

        if (error.response) {
          const { status, data } = error.response;
          const errorMessage = data?.message || data?.error || `HTTP ${status} Error`;
          throw createErrorFromResponse(errorMessage, status, data);
        }

        throw new NetworkError(`Network error: ${error.message}`);
      }
    );
  }

  private async post(path: string, data: any): Promise<any> {
    const response: AxiosResponse = await this.axiosInstance.post(path, data);
    return response.data;
  }


  private isValidConsumeTokensRequest(request: ConsumeTokensRequest): boolean {
    if (!request.userIdentifier || request.userIdentifier.trim() === '') {
      return false;
    }
    if (!request.tokensRequested || request.tokensRequested <= 0) {
      return false;
    }
    if (!request.operation && !request.path) {
      return false;
    }
    if (request.operation && request.path) {
      return false;
    }
    if (request.path && !request.httpMethod) {
      return false;
    }

    return true;
  }

  private parseConsumeTokensResponse(data: any): ConsumeTokensResponse {
    return {
      tokensRemaining: data.tokensRemaining || 0,
      tokensConsumed: data.tokensConsumed || 0,
      throttles: data.throttles || 0,
      rule: {
        id: data.rule?.id || '',
        name: data.rule?.name || '',
        refillRate: data.rule?.refillRate || 0,
        burstRate: data.rule?.burstRate || 0,
        isDefault: data.rule?.isDefault || false,
        matcher: data.rule?.matcher,
        httpMethod: data.rule?.httpMethod
      }
    };
  }
}
