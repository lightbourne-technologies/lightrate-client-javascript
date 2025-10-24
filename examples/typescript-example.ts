/**
 * TypeScript example for the LightRate JavaScript client
 */

import { 
  LightRateClient, 
  createClient, 
  configure, 
  getClient,
  ConsumeTokensRequest,
  CheckTokensRequest,
  ClientOptions
} from '../src/index';

// Example 1: Create a client with default bucket size configuration
const client = new LightRateClient(
  process.env.LIGHTRATE_API_KEY || 'your_api_key_here',
  process.env.LIGHTRATE_APPLICATION_ID || 'your_application_id_here',
  {
    defaultLocalBucketSize: 20,  // Default bucket size for all operations
    logger: process.env.DEBUG ? console : null
  }
);

console.log('=== LightRate TypeScript Client Example ===');
console.log();

async function runExamples(): Promise<void> {
  try {
    // Example 1: Email operation using local bucket
    console.log('1. Email operation (bucket size: 20):');
    const result1 = await client.consumeLocalBucketToken(
      'user123',
      'send_email'
    );

    console.log(`   Success: ${result1.success}`);
    console.log(`   Used local token: ${result1.usedLocalToken}`);
    console.log(`   Bucket status: ${JSON.stringify(result1.bucketStatus)}`);
    console.log();

    // Example 2: Direct API call with request object
    console.log('2. Direct API call with request object:');
    const consumeRequest: ConsumeTokensRequest = {
      operation: 'send_notification',
      userIdentifier: 'user789',
      tokensRequested: 3,
      timestamp: new Date()
    };

    const apiResponse = await client.consumeTokensWithRequest(consumeRequest);
    console.log(`   Success: ${apiResponse.success}`);
    console.log(`   Tokens consumed: ${apiResponse.tokensConsumed}`);
    console.log(`   Tokens remaining: ${apiResponse.tokensRemaining}`);
    console.log();

    // Example 3: Using global configuration
    console.log('3. Using global configuration:');
    configure({
      apiKey: process.env.LIGHTRATE_API_KEY || 'your_api_key_here',
      applicationId: process.env.LIGHTRATE_APPLICATION_ID || 'your_application_id_here',
      timeout: 60,
      retryAttempts: 5
    });

    const globalClient = getClient();
    const globalResponse = await globalClient.consumeTokens(
      'user456',
      1,
      'send_sms'
    );

    console.log(`   Global client - Success: ${globalResponse.success}`);
    console.log(`   Tokens consumed: ${globalResponse.tokensConsumed}`);
    console.log(`   Tokens remaining: ${globalResponse.tokensRemaining}`);
    console.log();

    // Example 4: Using convenience method
    console.log('4. Using convenience method:');
    const convenienceClient = createClient(
      process.env.LIGHTRATE_API_KEY || 'your_api_key_here',
      process.env.LIGHTRATE_APPLICATION_ID || 'your_application_id_here',
      { timeout: 30 }
    );

    const convenienceResponse = await convenienceClient.consumeTokens(
      'user999',
      1,
      'send_notification'
    );

    console.log(`   Convenience client - Success: ${convenienceResponse.success}`);
    console.log(`   Tokens consumed: ${convenienceResponse.tokensConsumed}`);
    console.log();

  } catch (error: any) {
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
console.log('=== TypeScript Example Complete ===');

// Run the examples
runExamples();
