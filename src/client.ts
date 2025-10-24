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
  BucketSizeConfigs,
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
  private bucketSizeConfigs: BucketSizeConfigs;
  private axiosInstance!: AxiosInstance;
  private bucketMutexes: Map<string, { locked: boolean; queue: Array<() => void> }>;

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

    this.bucketSizeConfigs = options.bucketSizeConfigs || {};
    this.tokenBuckets = new Map();
    this.bucketMutexes = new Map();
    
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
    const bucketKey = this.createBucketKey(userIdentifier, operation, path, httpMethod);
    const release = await this.acquire(bucketKey);
    try {
      const bucket = this.getOrCreateBucket(userIdentifier, operation, path, httpMethod);

      const tokensAvailableLocally = bucket.hasTokens();
      let tokensConsumed = 0;
      
      if (!tokensAvailableLocally) {
        const tokensToFetch = this.getBucketSizeForOperation(operation, path);
        const request: ConsumeTokensRequest = {
          operation,
          path,
          httpMethod,
          userIdentifier,
          tokensRequested: tokensToFetch,
          timestamp: new Date(),
          applicationId: this.configuration.applicationId
        };

        try {
          const response = await this.post('/api/v1/tokens/consume', request);
          tokensConsumed = response.tokensConsumed || 0;
          
          if (tokensConsumed > 0) {
            bucket.refill(tokensConsumed);
          }
        } catch (error) {
          return {
            success: false,
            usedLocalToken: false,
            bucketStatus: bucket.getStatus()
          };
        }
      }

      if (!tokensAvailableLocally && tokensConsumed === 0) {
        return {
          success: false,
          usedLocalToken: false,
          bucketStatus: bucket.getStatus()
        };
      }

      const consumedSuccessfully = bucket.consumeToken();

      return {
        success: consumedSuccessfully,
        usedLocalToken: tokensAvailableLocally,
        bucketStatus: bucket.getStatus()
      };
    } finally {
      release();
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

  private getOrCreateBucket(
    userIdentifier: string,
    operation?: string,
    path?: string,
    httpMethod?: string
  ): TokenBucket {
    // Create a unique key for this user/operation/path combination
    const bucketKey = this.createBucketKey(userIdentifier, operation, path, httpMethod);
    
    // Return existing bucket or create a new one with appropriate size
    if (!this.tokenBuckets.has(bucketKey)) {
      const bucketSize = this.getBucketSizeForOperation(operation, path);
      this.tokenBuckets.set(bucketKey, new TokenBucket(bucketSize));
    }

    return this.tokenBuckets.get(bucketKey)!;
  }

  private getBucketSizeForOperation(operation?: string, path?: string): number {
    // Check for operation-specific configuration
    if (operation && this.bucketSizeConfigs.operations && this.bucketSizeConfigs.operations[operation]) {
      return this.bucketSizeConfigs.operations[operation];
    }
    
    // Check for path-specific configuration
    if (path && this.bucketSizeConfigs.paths && this.bucketSizeConfigs.paths[path]) {
      return this.bucketSizeConfigs.paths[path];
    }

    // Fall back to default bucket size
    return this.configuration.defaultLocalBucketSize;
  }

  private createBucketKey(
    userIdentifier: string,
    operation?: string,
    path?: string,
    httpMethod?: string
  ): string {
    // Create a unique key that combines user, operation, and path
    if (operation) {
      return `${userIdentifier}:operation:${operation}`;
    } else if (path) {
      return `${userIdentifier}:path:${path}:${httpMethod}`;
    } else {
      throw new Error('Either operation or path must be specified');
    }
  }

  private validateConfiguration(): void {
    if (!this.configuration.isValid()) {
      throw new ConfigurationError('API key is required');
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

  // Lightweight async mutex implementation keyed by bucket key
  private async acquire(key: string): Promise<() => void> {
    return new Promise((resolve) => {
      const mutex = this.bucketMutexes.get(key) || { locked: false, queue: [] };
      
      if (!mutex.locked) {
        // We can acquire the lock immediately
        mutex.locked = true;
        this.bucketMutexes.set(key, mutex);
        resolve(() => {
          mutex.locked = false;
          const next = mutex.queue.shift();
          if (next) {
            next();
          }
        });
      } else {
        // We need to wait in the queue
        mutex.queue.push(() => {
          mutex.locked = true;
          resolve(() => {
            mutex.locked = false;
            const next = mutex.queue.shift();
            if (next) {
              next();
            }
          });
        });
        this.bucketMutexes.set(key, mutex);
      }
    });
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
        isDefault: data.rule?.isDefault || false
      }
    };
  }
}
