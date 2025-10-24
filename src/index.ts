/**
 * LightRate Client JavaScript
 * 
 * A JavaScript client for the Lightrate token management API, providing easy-to-use methods 
 * for consuming and checking tokens with local bucket management.
 */

import { LightRateClient } from './client';
import { Configuration } from './configuration';
import { ConfigurationOptions, ClientOptions } from './types';

// Export all types
export * from './types';

// Export all error classes
export * from './errors';

// Export main classes
export { LightRateClient, Configuration };

// Export version
export const VERSION = '1.0.0';

// Global configuration instance
let globalConfiguration: Configuration | null = null;
let globalClient: LightRateClient | null = null;

/**
 * Configure the global LightRate client
 */
export function configure(options: Partial<ConfigurationOptions>): void {
  if (!globalConfiguration) {
    globalConfiguration = new Configuration(options);
  } else {
    globalConfiguration.update(options);
  }
  
  // Reset global client when configuration changes
  globalClient = null;
}

/**
 * Get the global configuration
 */
export function getConfiguration(): Configuration {
  if (!globalConfiguration) {
    globalConfiguration = new Configuration();
  }
  return globalConfiguration;
}

/**
 * Get the global client instance
 */
export function getClient(): LightRateClient {
  if (!globalClient) {
    const config = getConfiguration();
    if (!config.isValid()) {
      throw new Error('API key and application ID must be configured before using the global client. Call configure() first.');
    }
    globalClient = new LightRateClient(config.apiKey, config.applicationId);
  }
  return globalClient;
}

/**
 * Create a new client with API key and application ID
 */
export function createClient(apiKey: string, applicationId: string, options?: ClientOptions): LightRateClient {
  return new LightRateClient(apiKey, applicationId, options);
}

/**
 * Reset global configuration and client
 */
export function reset(): void {
  globalConfiguration = null;
  globalClient = null;
}

// Default export for convenience
export default {
  VERSION,
  configure,
  getConfiguration,
  getClient,
  createClient,
  reset,
  LightRateClient,
  Configuration
};
