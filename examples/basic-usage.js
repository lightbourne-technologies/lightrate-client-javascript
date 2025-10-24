#!/usr/bin/env node

/**
 * Basic usage example for the LightRate JavaScript client
 */

const { LightRateClient, createClient, configure, getClient } = require('../dist/index.js');

// Example 1: Create a client with default bucket size configuration
const client = new LightRateClient(
  process.env.LIGHTRATE_API_KEY || 'your_api_key_here',
  process.env.LIGHTRATE_APPLICATION_ID || 'your_application_id_here',
  {
    defaultLocalBucketSize: 20,  // Default bucket size for all operations
    logger: process.env.DEBUG ? console : null
  }
);

console.log('=== LightRate Client with Local Token Buckets ===');
console.log();

async function runExamples() {
  try {
    // Example 1: Email operation (uses default bucket size)
    console.log('1. Email operation (bucket size: 20):');
    const result1 = await client.consumeLocalBucketToken(
      'user123',
      'send_email'
    );

    console.log(`   Success: ${result1.success}`);
    console.log(`   Used local token: ${result1.usedLocalToken}`);
    console.log(`   Bucket status: ${JSON.stringify(result1.bucketStatus)}`);
    console.log();

    // Example 2: SMS operation (uses default bucket size)
    console.log('2. SMS operation (bucket size: 20):');
    const result2 = await client.consumeLocalBucketToken(
      'user123',
      'send_sms'
    );

    console.log(`   Success: ${result2.success}`);
    console.log(`   Used local token: ${result2.usedLocalToken}`);
    console.log(`   Bucket status: ${JSON.stringify(result2.bucketStatus)}`);
    console.log();

    // Example 3: Notification operation (uses default bucket size)
    console.log('3. Notification operation (bucket size: 20):');
    const result3 = await client.consumeLocalBucketToken(
      'user123',
      'send_notification'
    );

    console.log(`   Success: ${result3.success}`);
    console.log(`   Used local token: ${result3.usedLocalToken}`);
    console.log(`   Bucket status: ${JSON.stringify(result3.bucketStatus)}`);
    console.log();

    // Example 4: Path-based operation (uses default bucket size)
    console.log('4. Path-based operation (bucket size: 20):');
    const result4 = await client.consumeLocalBucketToken(
      'user456',
      undefined,
      '/api/v1/emails/send',
      'POST'
    );

    console.log(`   Success: ${result4.success}`);
    console.log(`   Used local token: ${result4.usedLocalToken}`);
    console.log(`   Bucket status: ${JSON.stringify(result4.bucketStatus)}`);
    console.log();

    // Example 5: Direct API call using consume_tokens
    console.log('5. Direct API call using consume_tokens:');
    const apiResponse = await client.consumeTokens(
      'user789',
      3,
      'send_notification'
    );

    console.log(`   Success: ${apiResponse.success}`);
    console.log(`   Tokens consumed: ${apiResponse.tokensConsumed}`);
    console.log(`   Tokens remaining: ${apiResponse.tokensRemaining}`);
    console.log();

  } catch (error) {
    if (error.name === 'UnauthorizedError') {
      console.log('❌ Authentication failed:', error.message);
      console.log('   Please check your API key');
    } else if (error.name === 'ForbiddenError') {
      console.log('❌ Access denied:', error.message);
      console.log('   Please check your subscription status');
    } else if (error.name === 'TooManyRequestsError') {
      console.log('⚠️  Rate limited:', error.message);
      console.log('   Please wait before making more requests');
    } else if (error.name === 'NotFoundError') {
      console.log('❌ Rule not found:', error.message);
      console.log('   Please check your operation/path configuration');
    } else if (error.name === 'APIError') {
      console.log(`❌ API Error (${error.statusCode}):`, error.message);
    } else if (error.name === 'NetworkError') {
      console.log('❌ Network error:', error.message);
      console.log('   Please check your internet connection');
    } else if (error.name === 'TimeoutError') {
      console.log('❌ Request timed out:', error.message);
    } else {
      console.log('❌ Unexpected error:', error.name + ':', error.message);
      if (error.stack) {
        console.log(error.stack.split('\n').slice(0, 5).join('\n'));
      }
    }
  }
}

console.log();
console.log('=== Example Complete ===');

// Run the examples
runExamples();
