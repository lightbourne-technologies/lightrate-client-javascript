/**
 * Tests for Configuration class
 */

import { Configuration } from '../configuration';

describe('Configuration', () => {
  let config: Configuration;

  beforeEach(() => {
    config = new Configuration();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(config.apiKey).toBe('');
      expect(config.applicationId).toBe('');
      expect(config.timeout).toBe(30);
      expect(config.retryAttempts).toBe(3);
      expect(config.logger).toBeUndefined();
      expect(config.defaultLocalBucketSize).toBe(5);
    });

    it('should initialize with provided values', () => {
      const options = {
        apiKey: 'test-key',
        applicationId: 'test-app-id',
        timeout: 60,
        retryAttempts: 5,
        logger: console,
        defaultLocalBucketSize: 10
      };
      const customConfig = new Configuration(options);
      
      expect(customConfig.apiKey).toBe('test-key');
      expect(customConfig.applicationId).toBe('test-app-id');
      expect(customConfig.timeout).toBe(60);
      expect(customConfig.retryAttempts).toBe(5);
      expect(customConfig.logger).toBe(console);
      expect(customConfig.defaultLocalBucketSize).toBe(10);
    });
  });

  describe('isValid', () => {
    it('should return false when apiKey is empty', () => {
      expect(config.isValid()).toBe(false);
    });

    it('should return false when applicationId is empty', () => {
      config.apiKey = 'test-key';
      expect(config.isValid()).toBe(false);
    });

    it('should return true when both apiKey and applicationId are provided', () => {
      config.apiKey = 'test-key';
      config.applicationId = 'test-app-id';
      expect(config.isValid()).toBe(true);
    });
  });

  describe('toObject', () => {
    it('should return configuration object with masked apiKey', () => {
      config.apiKey = 'secret-key';
      config.applicationId = 'test-app-id';
      const obj = config.toObject();
      
      expect(obj).toEqual({
        apiKey: '******',
        applicationId: 'test-app-id',
        timeout: 30,
        retryAttempts: 3,
        logger: undefined,
        defaultLocalBucketSize: 5
      });
    });
  });

  describe('update', () => {
    it('should update provided values', () => {
      config.update({
        apiKey: 'new-key',
        applicationId: 'new-app-id',
        timeout: 45,
        retryAttempts: 2
      });
      
      expect(config.apiKey).toBe('new-key');
      expect(config.applicationId).toBe('new-app-id');
      expect(config.timeout).toBe(45);
      expect(config.retryAttempts).toBe(2);
      expect(config.logger).toBeUndefined();
      expect(config.defaultLocalBucketSize).toBe(5);
    });

    it('should not update undefined values', () => {
      const originalApiKey = config.apiKey;
      const originalTimeout = config.timeout;
      
      config.update({});
      
      expect(config.apiKey).toBe(originalApiKey);
      expect(config.timeout).toBe(originalTimeout);
    });
  });
});
