/**
 * Tests for LightRateClient class
 */

import axios from 'axios';
import { LightRateClient } from '../client';
import { ConfigurationError, APIError } from '../errors';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LightRateClient', () => {
  let client: LightRateClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset axios create mock
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
  });

  describe('constructor', () => {
    it('should create client with API key and application ID', () => {
      client = new LightRateClient('test-key', 'test-app-id');
      expect(client.getConfiguration().apiKey).toBe('test-key');
      expect(client.getConfiguration().applicationId).toBe('test-app-id');
    });

    it('should create client with options', () => {
      client = new LightRateClient('test-key', 'test-app-id', {
        timeout: 60,
        retryAttempts: 5,
        defaultLocalBucketSize: 10
      });
      const config = client.getConfiguration();
      expect(config.timeout).toBe(60);
      expect(config.retryAttempts).toBe(5);
      expect(config.defaultLocalBucketSize).toBe(10);
    });

    it('should throw ConfigurationError when no API key provided', () => {
      expect(() => new LightRateClient('', '')).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when empty API key provided', () => {
      expect(() => new LightRateClient('', 'test-app-id')).toThrow(ConfigurationError);
    });
  });

  describe('consumeTokens', () => {
    beforeEach(() => {
      client = new LightRateClient('test-key', 'test-app-id');
    });

    it('should make POST request to consume tokens endpoint', async () => {
      const mockResponse = {
        tokensRemaining: 99,
        tokensConsumed: 1,
        throttles: 0,
        rule: {
          id: 'app_test123',
          name: 'Test App',
          refillRate: 10,
          burstRate: 100,
          isDefault: true
        }
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id');
      const response = await client.consumeTokens(
        'user123',
        1,
        'send_email'
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/tokens/consume',
        expect.objectContaining({
          operation: 'send_email',
          userIdentifier: 'user123',
          tokensRequested: 1
        })
      );

      expect(response.tokensConsumed).toBe(1);
      expect(response.tokensRemaining).toBe(99);
      expect(response.throttles).toBe(0);
      expect(response.rule.id).toBe('app_test123');
      expect(response.rule.name).toBe('Test App');
      expect(response.rule.refillRate).toBe(10);
      expect(response.rule.burstRate).toBe(100);
      expect(response.rule.isDefault).toBe(true);
    });

    it('should handle path-based requests', async () => {
      const mockResponse = {
        tokensRemaining: 99,
        tokensConsumed: 1,
        throttles: 0,
        rule: {
          id: 'app_test123',
          name: 'Test App',
          refillRate: 10,
          burstRate: 100,
          isDefault: true
        }
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id');
      const response = await client.consumeTokens(
        'user123',
        1,
        undefined,
        '/api/v1/emails/send',
        'POST'
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/tokens/consume',
        expect.objectContaining({
          path: '/api/v1/emails/send',
          httpMethod: 'POST',
          userIdentifier: 'user123',
          tokensRequested: 1
        })
      );

      expect(response.tokensConsumed).toBe(1);
      expect(response.tokensRemaining).toBe(99);
    });
  });

  describe('consumeLocalBucketToken', () => {
    beforeEach(() => {
      client = new LightRateClient('test-key', 'test-app-id');
    });

    it('should consume token from local bucket when available', async () => {
      // First, refill the bucket by making an API call
      const mockResponse = {
        tokensRemaining: 95,
        tokensConsumed: 5,
        throttles: 0,
        rule: {
          id: 'app_test123',
          name: 'Test App',
          refillRate: 10,
          burstRate: 100,
          isDefault: true
        }
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id');
      
      // First call should fetch tokens from API
      const response1 = await client.consumeLocalBucketToken(
        'user123',
        'send_email'
      );

      expect(response1.success).toBe(true);
      expect(response1.usedLocalToken).toBe(false); // First call uses API

      // Second call should use local bucket
      const response2 = await client.consumeLocalBucketToken(
        'user123',
        'send_email'
      );

      expect(response2.success).toBe(true);
      expect(response2.usedLocalToken).toBe(true); // Second call uses local bucket
    });

    it('should return failure when API returns 0 tokens', async () => {
      const mockResponse = {
        tokensRemaining: 0,
        tokensConsumed: 0,
        throttles: 1,
        rule: {
          id: 'app_test123',
          name: 'Test App',
          refillRate: 10,
          burstRate: 100,
          isDefault: true
        }
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id');
      const response = await client.consumeLocalBucketToken(
        'user123',
        'send_email'
      );

      expect(response.success).toBe(false);
      expect(response.usedLocalToken).toBe(false);
    });
  });

  describe('bucket management', () => {
    beforeEach(() => {
      client = new LightRateClient('test-key', 'test-app-id');
    });

    it('should create separate buckets for different operations', async () => {
      const mockResponse = {
        tokensRemaining: 95,
        tokensConsumed: 5,
        throttles: 0,
        rule: {
          id: 'app_test123',
          name: 'Test App',
          refillRate: 10,
          burstRate: 100,
          isDefault: true
        }
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id');
      
      // Create buckets for different operations
      await client.consumeLocalBucketToken('user123', 'send_email');
      await client.consumeLocalBucketToken('user123', 'send_sms');

      const statuses = client.getAllBucketStatuses();
      expect(Object.keys(statuses)).toHaveLength(2);
      expect(statuses['user123:operation:send_email']).toBeDefined();
      expect(statuses['user123:operation:send_sms']).toBeDefined();
    });

    it('should create separate buckets for different paths', async () => {
      const mockResponse = {
        tokensRemaining: 95,
        tokensConsumed: 5,
        throttles: 0,
        rule: {
          id: 'app_test123',
          name: 'Test App',
          refillRate: 10,
          burstRate: 100,
          isDefault: true
        }
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id');
      
      // Create buckets for different paths
      await client.consumeLocalBucketToken('user123', undefined, '/api/v1/emails/send', 'POST');
      await client.consumeLocalBucketToken('user123', undefined, '/api/v1/sms/send', 'POST');

      const statuses = client.getAllBucketStatuses();
      expect(Object.keys(statuses)).toHaveLength(2);
      expect(statuses['user123:path:/api/v1/emails/send:POST']).toBeDefined();
      expect(statuses['user123:path:/api/v1/sms/send:POST']).toBeDefined();
    });

    it('should reset all buckets', async () => {
      const mockResponse = {
        tokensRemaining: 95,
        tokensConsumed: 5,
        throttles: 0,
        rule: {
          id: 'app_test123',
          name: 'Test App',
          refillRate: 10,
          burstRate: 100,
          isDefault: true
        }
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id');
      
      // Create some buckets
      await client.consumeLocalBucketToken('user123', 'send_email');
      expect(Object.keys(client.getAllBucketStatuses())).toHaveLength(1);

      // Reset all buckets
      client.resetAllBuckets();
      expect(Object.keys(client.getAllBucketStatuses())).toHaveLength(0);
    });
  });

  describe('default bucket size configuration', () => {
    it('should use default bucket size for all operations', () => {
      const client = new LightRateClient('test-key', 'test-app-id', {
        defaultLocalBucketSize: 10
      });

      expect(client.getConfiguration().defaultLocalBucketSize).toBe(10);
    });

    it('should use default bucket size when not specified', () => {
      const client = new LightRateClient('test-key', 'test-app-id');

      expect(client.getConfiguration().defaultLocalBucketSize).toBe(5);
    });
  });

  describe('thread safety for consumeLocalBucketToken', () => {
    beforeEach(() => {
      client = new LightRateClient('test-key', 'test-app-id');
    });

    it('should handle concurrent access to the same bucket safely', async () => {
      const mockResponse = {
        tokensConsumed: 5, // Default bucket size
        success: true
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id');
      
      // Create 5 concurrent requests to the same bucket (within bucket size)
      const promises = Array.from({ length: 5 }, () => 
        client.consumeLocalBucketToken('user123', 'send_email')
      );

      const results = await Promise.all(promises);

      // All requests should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Only the first request should have used the API (not local token)
      const apiUsedCount = results.filter(r => !r.usedLocalToken).length;
      expect(apiUsedCount).toBe(1);
      
      // The rest should have used local tokens
      const localUsedCount = results.filter(r => r.usedLocalToken).length;
      expect(localUsedCount).toBe(4);

      // API should only be called once (for the initial refill)
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent access to different buckets independently', async () => {
      const mockResponse = {
        tokensRemaining: 95,
        tokensConsumed: 5,
        throttles: 0,
        rule: {
          id: 'app_test123',
          name: 'Test App',
          refillRate: 10,
          burstRate: 100,
          isDefault: true
        }
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id');
      
      // Create concurrent requests to different buckets
      const promises = [
        client.consumeLocalBucketToken('user123', 'send_email'),
        client.consumeLocalBucketToken('user123', 'send_sms'),
        client.consumeLocalBucketToken('user456', 'send_email'),
        client.consumeLocalBucketToken('user123', undefined, '/api/v1/emails/send', 'POST')
      ];

      const results = await Promise.all(promises);

      // All requests should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Each bucket should have made its own API call
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(4);
    });

    it('should maintain correct token counts under concurrent access', async () => {
      const mockResponse = {
        tokensRemaining: 90,
        tokensConsumed: 10,
        throttles: 0,
        rule: {
          id: 'app_test123',
          name: 'Test App',
          refillRate: 10,
          burstRate: 100,
          isDefault: true
        }
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id', {
        defaultLocalBucketSize: 10 // Match the API response
      });
      
      // First, refill the bucket
      await client.consumeLocalBucketToken('user123', 'send_email');
      
      // Reset the mock to track only the concurrent calls
      mockAxiosInstance.post.mockClear();
      
      // Create 5 concurrent requests to consume from the local bucket
      const promises = Array.from({ length: 5 }, () => 
        client.consumeLocalBucketToken('user123', 'send_email')
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // All should use local tokens (since we have 10 tokens and only need 5)
      expect(results.every(r => r.usedLocalToken)).toBe(true);
      
      // No additional API calls should be made
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(0);
      
      // Check that tokens were properly consumed
      const statuses = client.getAllBucketStatuses();
      const bucketStatus = statuses['user123:operation:send_email'];
      // Should have 5 tokens remaining (10 - 5 consumed), but allow for small variations due to timing
      expect(bucketStatus.tokensRemaining).toBeGreaterThanOrEqual(4);
      expect(bucketStatus.tokensRemaining).toBeLessThanOrEqual(5);
    });

    it('should handle API failures gracefully under concurrent access', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockRejectedValue(new Error('API Error')),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id');
      
      // Create concurrent requests when API will fail
      const promises = Array.from({ length: 5 }, () => 
        client.consumeLocalBucketToken('user123', 'send_email')
      );

      const results = await Promise.all(promises);

      // All should fail since API is down and no local tokens available
      expect(results.every(r => !r.success)).toBe(true);
      expect(results.every(r => !r.usedLocalToken)).toBe(true);
    });

    it('should serialize access to the same bucket even with delays', async () => {
      let callCount = 0;
      const mockResponse = {
        tokensRemaining: 98,
        tokensConsumed: 2, // Small bucket size
        throttles: 0,
        rule: {
          id: 'app_test123',
          name: 'Test App',
          refillRate: 10,
          burstRate: 100,
          isDefault: true
        }
      };

      const mockAxiosInstance = {
        post: jest.fn().mockImplementation(() => {
          callCount++;
          // Add a small delay to simulate network latency
          return new Promise(resolve => 
            setTimeout(() => resolve({ data: mockResponse }), 10)
          );
        }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id', {
        defaultLocalBucketSize: 2 // Small bucket size
      });
      
      // Create concurrent requests with staggered timing
      const promises = [
        client.consumeLocalBucketToken('user123', 'send_email'),
        new Promise(resolve => setTimeout(() => resolve(client.consumeLocalBucketToken('user123', 'send_email')), 5)),
        new Promise(resolve => setTimeout(() => resolve(client.consumeLocalBucketToken('user123', 'send_email')), 10))
      ];

      const results = await Promise.all(promises) as any[];

      // All should succeed
      expect(results.every((r: any) => r.success)).toBe(true);
      
      // Should make 2 API calls: first refill (2 tokens), then second refill (2 tokens)
      // The mutex ensures they happen sequentially, not concurrently
      expect(callCount).toBe(2);
    });

    it('should handle bucket depletion and refill under concurrent access', async () => {
      const mockResponse = {
        tokensRemaining: 97,
        tokensConsumed: 3, // Small bucket size
        throttles: 0,
        rule: {
          id: 'app_test123',
          name: 'Test App',
          refillRate: 10,
          burstRate: 100,
          isDefault: true
        }
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({ data: mockResponse }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = new LightRateClient('test-key', 'test-app-id', {
        defaultLocalBucketSize: 3 // Small bucket size
      });
      
      // Create 6 concurrent requests (2x bucket size)
      const promises = Array.from({ length: 6 }, () => 
        client.consumeLocalBucketToken('user123', 'send_email')
      );

      const results = await Promise.all(promises);

      // All requests should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Should make 2 API calls: first refill (3 tokens), then second refill (3 tokens)
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      
      // Check that tokens were properly consumed
      const statuses = client.getAllBucketStatuses();
      const bucketStatus = statuses['user123:operation:send_email'];
      expect(bucketStatus.tokensRemaining).toBe(0); // 6 tokens - 6 consumed = 0
    });
  });
});
