/**
 * Tests for main module exports and global functions
 */

import {
  configure,
  getConfiguration,
  getClient,
  createClient,
  reset,
  VERSION,
  LightRateClient,
  Configuration
} from '../index';

describe('Main Module', () => {
  beforeEach(() => {
    // Reset global state before each test
    reset();
  });

  describe('VERSION', () => {
    it('should export version', () => {
      expect(VERSION).toBe('1.0.0');
    });
  });

  describe('configure', () => {
    it('should configure global configuration', () => {
      configure({
        apiKey: 'test-key',
        timeout: 60
      });

      const config = getConfiguration();
      expect(config.apiKey).toBe('test-key');
      expect(config.timeout).toBe(60);
    });

    it('should update existing configuration', () => {
      configure({
        apiKey: 'initial-key',
        timeout: 30
      });

      configure({
        apiKey: 'updated-key'
      });

      const config = getConfiguration();
      expect(config.apiKey).toBe('updated-key');
      expect(config.timeout).toBe(30); // Should not be reset
    });
  });

  describe('getConfiguration', () => {
    it('should return default configuration when not configured', () => {
      const config = getConfiguration();
      expect(config).toBeInstanceOf(Configuration);
      expect(config.apiKey).toBe('');
      expect(config.timeout).toBe(30);
    });

    it('should return same instance after configuration', () => {
      configure({
        apiKey: 'test-key'
      });

      const config1 = getConfiguration();
      const config2 = getConfiguration();
      expect(config1).toBe(config2);
    });
  });

  describe('getClient', () => {
    it('should return client instance', () => {
      configure({
        apiKey: 'test-key',
        applicationId: 'test-app-id'
      });

      const client = getClient();
      expect(client).toBeInstanceOf(LightRateClient);
    });

    it('should throw error when no API key and application ID configured', () => {
      expect(() => getClient()).toThrow('API key and application ID must be configured before using the global client');
    });

    it('should return same instance on multiple calls', () => {
      configure({
        apiKey: 'test-key',
        applicationId: 'test-app-id'
      });

      const client1 = getClient();
      const client2 = getClient();
      expect(client1).toBe(client2);
    });

    it('should create new client when configuration changes', () => {
      configure({
        apiKey: 'test-key',
        applicationId: 'test-app-id'
      });

      const client1 = getClient();
      
      configure({
        apiKey: 'new-key',
        applicationId: 'new-app-id'
      });

      const client2 = getClient();
      expect(client1).not.toBe(client2);
    });
  });

  describe('createClient', () => {
    it('should create new client with API key and application ID', () => {
      const client = createClient('test-key', 'test-app-id');
      expect(client).toBeInstanceOf(LightRateClient);
      expect(client.getConfiguration().apiKey).toBe('test-key');
      expect(client.getConfiguration().applicationId).toBe('test-app-id');
    });

    it('should create new client with options', () => {
      const client = createClient('test-key', 'test-app-id', {
        timeout: 60,
        retryAttempts: 5
      });

      expect(client).toBeInstanceOf(LightRateClient);
      expect(client.getConfiguration().apiKey).toBe('test-key');
      expect(client.getConfiguration().applicationId).toBe('test-app-id');
      expect(client.getConfiguration().timeout).toBe(60);
      expect(client.getConfiguration().retryAttempts).toBe(5);
    });

    it('should not affect global client', () => {
      configure({
        apiKey: 'global-key',
        applicationId: 'global-app-id'
      });

      const globalClient = getClient();
      const newClient = createClient('new-key', 'new-app-id');

      expect(globalClient).not.toBe(newClient);
      expect(globalClient.getConfiguration().apiKey).toBe('global-key');
      expect(newClient.getConfiguration().apiKey).toBe('new-key');
    });
  });

  describe('reset', () => {
    it('should reset global configuration and client', () => {
      configure({
        apiKey: 'test-key',
        applicationId: 'test-app-id'
      });

      const config1 = getConfiguration();
      const client1 = getClient();

      reset();

      const config2 = getConfiguration();
      expect(config1).not.toBe(config2);
      expect(config2.apiKey).toBe('');
      
      // Should throw error when trying to get client after reset without configuration
      expect(() => getClient()).toThrow('API key and application ID must be configured before using the global client');
    });
  });

  describe('exports', () => {
    it('should export all classes', () => {
      expect(LightRateClient).toBeDefined();
      expect(Configuration).toBeDefined();
    });

    it('should export all functions', () => {
      expect(configure).toBeDefined();
      expect(getConfiguration).toBeDefined();
      expect(getClient).toBeDefined();
      expect(createClient).toBeDefined();
      expect(reset).toBeDefined();
    });
  });
});
