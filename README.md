# LightRate Client JavaScript

A JavaScript/TypeScript client for the LightRate token management API, providing easy-to-use methods for consuming and checking tokens with local bucket management.

## Installation

```bash
npm install lightrate-client
```

Or with yarn:

```bash
yarn add lightrate-client
```

## Usage

### Configuration

Configure the client with your API credentials:

```javascript
const { configure, getClient } = require('lightrate-client');

configure({
  apiKey: 'your_api_key',
  applicationId: 'your_application_id', // required
  timeout: 30, // optional, defaults to 30 seconds
  retryAttempts: 3, // optional, defaults to 3
  logger: console // optional, for request logging
});
```

### Basic Usage

```javascript
const { LightRateClient, createClient } = require('lightrate-client');

// Simple usage - pass your API key and application ID
const client = new LightRateClient('your_api_key', 'your_application_id');

// Or use the convenience method
const client = createClient('your_api_key', 'your_application_id');

// With additional options
const client = new LightRateClient('your_api_key', 'your_application_id', {
  timeout: 60,
  defaultLocalBucketSize: 10
});

// Or configure globally and use the default client
configure({
  apiKey: 'your_api_key',
  applicationId: 'your_application_id'
});
const client = getClient();
```

### Consuming Tokens

```javascript
// Consume tokens by operation
const response = await client.consumeTokens(
  'user123',     // userIdentifier
  1,             // tokensRequested
  'send_email'   // operation
);

// Or consume tokens by path
const response = await client.consumeTokens(
  'user123',           // userIdentifier
  1,                   // tokensRequested
  undefined,           // operation (not used when path is specified)
  '/api/v1/emails/send', // path
  'POST'              // httpMethod (required when path is specified)
);

if (response.success) {
  console.log(`Tokens consumed successfully. Remaining: ${response.tokensRemaining}`);
} else {
  console.log(`Failed to consume tokens: ${response.error}`);
}
```

#### Using Local Token Buckets

The client supports local token buckets for improved performance. Buckets are automatically created based on the rules returned by the API, and are matched against incoming requests using the `matcher` field from the rule. Each bucket is associated with a specific user and rule, ensuring proper isolation.

```javascript
// Configure client with default bucket size
const client = new LightRateClient('your_api_key', 'your_application_id', {
  defaultLocalBucketSize: 20  // All operations use this bucket size
});

// Consume tokens using local bucket (more efficient)
const result = await client.consumeLocalBucketToken(
  'user123',     // userIdentifier
  'send_email'   // operation
);

console.log(`Success: ${result.success}`);
console.log(`Used local token: ${result.usedLocalToken}`);
console.log(`Bucket status: ${JSON.stringify(result.bucketStatus)}`);

// Note: If the API returns a default rule (isDefault: true), 
// no local bucket is created and tokens are consumed directly from the API
```

**Bucket Matching:**
- Buckets are matched using the `matcher` field from the rule, which supports regex patterns
- Each user has separate buckets per rule, ensuring proper isolation
- Buckets expire after 60 seconds of inactivity
- Default rules (isDefault: true) do not create local buckets

#### Using Request Objects

```javascript
const { ConsumeTokensRequest } = require('lightrate-client');

// Create a consume tokens request
const request = new ConsumeTokensRequest({
  operation: 'send_email',
  userIdentifier: 'user123',
  tokensRequested: 1
});

// Consume tokens
const response = await client.consumeTokensWithRequest(request);

if (response.success) {
  console.log(`Tokens consumed successfully. Remaining: ${response.tokensRemaining}`);
} else {
  console.log(`Failed to consume tokens: ${response.error}`);
}
```


### Complete Example

```javascript
const { LightRateClient } = require('lightrate-client');

// Create a client with your API key and application ID
const client = new LightRateClient('your_api_key', 'your_application_id');

async function example() {
  try {
    // Consume tokens
    const consumeResponse = await client.consumeTokens(
      'user123',
      1,
      'send_email'
    );

    if (consumeResponse.success) {
      console.log(`Successfully consumed tokens. Remaining: ${consumeResponse.tokensRemaining}`);
      // Proceed with your operation
    } else {
      console.log(`Failed to consume tokens: ${consumeResponse.error}`);
      // Handle rate limiting
    }

  } catch (error) {
    if (error.name === 'UnauthorizedError') {
      console.log(`Authentication failed: ${error.message}`);
    } else if (error.name === 'TooManyRequestsError') {
      console.log(`Rate limited: ${error.message}`);
    } else if (error.name === 'APIError') {
      console.log(`API Error (${error.statusCode}): ${error.message}`);
    } else if (error.name === 'NetworkError') {
      console.log(`Network error: ${error.message}`);
    }
  }
}

example();
```

## TypeScript Support

This package includes full TypeScript support with type definitions:

```typescript
import { 
  LightRateClient, 
  ConsumeTokensRequest, 
  ClientOptions 
} from 'lightrate-client';

const client = new LightRateClient('your_api_key', 'your_application_id', {
  timeout: 30,
  retryAttempts: 3
} as ClientOptions);

const request: ConsumeTokensRequest = {
  operation: 'send_email',
  userIdentifier: 'user123',
  tokensRequested: 1
};

const response = await client.consumeTokensWithRequest(request);
```

## Error Handling

The client provides comprehensive error handling with specific exception types:

```javascript
try {
  const response = await client.consumeTokens('send_email', undefined, undefined, 'user123', 1);
} catch (error) {
  if (error.name === 'UnauthorizedError') {
    console.log('Authentication failed:', error.message);
  } else if (error.name === 'NotFoundError') {
    console.log('Resource not found:', error.message);
  } else if (error.name === 'APIError') {
    console.log(`API Error (${error.statusCode}):`, error.message);
  } else if (error.name === 'NetworkError') {
    console.log('Network error:', error.message);
  } else if (error.name === 'TimeoutError') {
    console.log('Request timed out:', error.message);
  }
}
```

Available error types:
- `LightRateError` - Base error class
- `ConfigurationError` - Configuration-related errors
- `AuthenticationError` - Authentication-related errors
- `APIError` - Base API error class
- `BadRequestError` - 400 errors
- `UnauthorizedError` - 401 errors
- `ForbiddenError` - 403 errors
- `NotFoundError` - 404 errors
- `UnprocessableEntityError` - 422 errors
- `TooManyRequestsError` - 429 errors
- `InternalServerError` - 500 errors
- `ServiceUnavailableError` - 503 errors
- `NetworkError` - Network-related errors
- `TimeoutError` - Request timeout errors

## API Reference

### Classes

#### `LightRateClient`

Main client class for interacting with the LightRate API.

**Constructor:**
```javascript
new LightRateClient(apiKey: string, applicationId: string, options?: ClientOptions)
```

**Methods:**

- `consumeTokens(userIdentifier, tokensRequested, operation?, path?, httpMethod?): Promise<ConsumeTokensResponse>`
- `consumeLocalBucketToken(userIdentifier, operation?, path?, httpMethod?): Promise<ConsumeLocalBucketTokenResponse>`
- `consumeTokensWithRequest(request): Promise<ConsumeTokensResponse>`
- `getAllBucketStatuses(): Record<string, any>`
- `resetAllBuckets(): void`
- `getConfiguration(): Configuration`

#### `Configuration`

Configuration class for client settings.

**Constructor:**
```javascript
new Configuration(options?: Partial<ConfigurationOptions>)
```

**Methods:**
- `isValid(): boolean`
- `toObject(): Record<string, any>`
- `update(options): void`

#### `TokenBucket`

Token bucket for local token management. Buckets are matched against incoming requests using the `matcher` field from the rule returned by the API. Each bucket is associated with a specific rule and user identifier.

**Constructor:**
```javascript
new TokenBucket(maxTokens: number, ruleId: string, userIdentifier: string, matcher?: string, httpMethod?: string)
```

**Methods:**
- `hasTokens(): boolean`
- `consumeToken(): boolean`
- `consumeTokens(count): number`
- `refill(tokensToFetch): number`
- `getStatus(): TokenBucketStatus`
- `reset(): void`
- `matches(operation?, path?, httpMethod?): boolean` - Check if this bucket matches the given request using the matcher regex
- `expired(): boolean` - Check if bucket has expired (not accessed in 60 seconds)
- `checkAndConsumeToken(): boolean` - Atomically check and consume a token

### Global Functions

- `configure(options): void` - Configure global client
- `getClient(): LightRateClient` - Get global client instance
- `createClient(apiKey, applicationId, options?): LightRateClient` - Create new client
- `reset(): void` - Reset global configuration

### Types

- `ConsumeTokensRequest` - Includes optional `tokensRequestedForDefaultBucketMatch` field
- `ConsumeTokensResponse`
- `ConsumeLocalBucketTokenResponse`
- `Rule` - Includes `matcher` (regex pattern) and `httpMethod` fields for bucket matching, plus `isDefault` flag
- `ConfigurationOptions`
- `ClientOptions`
- `TokenBucketStatus`

## Development

After checking out the repo, run `npm install` to install dependencies. Then, run `npm test` to run the tests. You can also run `npm run dev` for development mode with watch.

To build the project, run `npm run build`.

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/lightbourne-technologies/lightrate-client-javascript. This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the code of conduct.

## License

The package is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

## Code of Conduct

Everyone interacting in the LightRate Client JavaScript project's codebases, issue trackers, chat rooms and mailing lists is expected to follow the code of conduct.
