/**
 * Configuration class for the LightRate client
 */

import { ConfigurationOptions } from './types';

export class Configuration {
  public apiKey: string;
  public timeout: number;
  public retryAttempts: number;
  public logger?: any;
  public defaultLocalBucketSize: number;
  public applicationId?: string;

  constructor(options?: Partial<ConfigurationOptions>) {
    this.apiKey = options?.apiKey || '';
    this.timeout = options?.timeout || 30;
    this.retryAttempts = options?.retryAttempts || 3;
    this.logger = options?.logger;
    this.defaultLocalBucketSize = options?.defaultLocalBucketSize || 5;
    this.applicationId = options?.applicationId;
  }

  /**
   * Check if the configuration is valid
   */
  public isValid(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get configuration as a plain object (with masked API key)
   */
  public toObject(): Record<string, any> {
    return {
      apiKey: '******',
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      logger: this.logger,
      defaultLocalBucketSize: this.defaultLocalBucketSize,
      applicationId: this.applicationId
    };
  }

  /**
   * Update configuration values
   */
  public update(options: Partial<ConfigurationOptions>): void {
    if (options.apiKey !== undefined) {
      this.apiKey = options.apiKey;
    }
    if (options.timeout !== undefined) {
      this.timeout = options.timeout;
    }
    if (options.retryAttempts !== undefined) {
      this.retryAttempts = options.retryAttempts;
    }
    if (options.logger !== undefined) {
      this.logger = options.logger;
    }
    if (options.defaultLocalBucketSize !== undefined) {
      this.defaultLocalBucketSize = options.defaultLocalBucketSize;
    }
    if (options.applicationId !== undefined) {
      this.applicationId = options.applicationId;
    }
  }
}
