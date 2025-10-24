/**
 * Tests for error classes
 */

import {
  LightRateError,
  ConfigurationError,
  AuthenticationError,
  APIError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  NetworkError,
  TimeoutError,
  createErrorFromResponse
} from '../errors';

describe('Error Classes', () => {
  describe('LightRateError', () => {
    it('should create error with message', () => {
      const error = new LightRateError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('LightRateError');
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new ConfigurationError('Invalid config');
      expect(error.message).toBe('Invalid config');
      expect(error.name).toBe('ConfigurationError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Auth failed');
      expect(error.message).toBe('Auth failed');
      expect(error.name).toBe('AuthenticationError');
    });
  });

  describe('APIError', () => {
    it('should create API error with status code and response body', () => {
      const error = new APIError('API Error', 400, { message: 'Bad request' });
      expect(error.message).toBe('API Error');
      expect(error.statusCode).toBe(400);
      expect(error.responseBody).toEqual({ message: 'Bad request' });
      expect(error.name).toBe('APIError');
    });

    it('should create API error without status code and response body', () => {
      const error = new APIError('API Error');
      expect(error.message).toBe('API Error');
      expect(error.statusCode).toBeUndefined();
      expect(error.responseBody).toBeUndefined();
    });
  });

  describe('Specific API Errors', () => {
    it('should create BadRequestError', () => {
      const error = new BadRequestError('Bad request', 400, {});
      expect(error.name).toBe('BadRequestError');
    });

    it('should create UnauthorizedError', () => {
      const error = new UnauthorizedError('Unauthorized', 401, {});
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should create ForbiddenError', () => {
      const error = new ForbiddenError('Forbidden', 403, {});
      expect(error.name).toBe('ForbiddenError');
    });

    it('should create NotFoundError', () => {
      const error = new NotFoundError('Not found', 404, {});
      expect(error.name).toBe('NotFoundError');
    });

    it('should create UnprocessableEntityError', () => {
      const error = new UnprocessableEntityError('Unprocessable', 422, {});
      expect(error.name).toBe('UnprocessableEntityError');
    });

    it('should create TooManyRequestsError', () => {
      const error = new TooManyRequestsError('Too many requests', 429, {});
      expect(error.name).toBe('TooManyRequestsError');
    });

    it('should create InternalServerError', () => {
      const error = new InternalServerError('Internal error', 500, {});
      expect(error.name).toBe('InternalServerError');
    });

    it('should create ServiceUnavailableError', () => {
      const error = new ServiceUnavailableError('Service unavailable', 503, {});
      expect(error.name).toBe('ServiceUnavailableError');
    });
  });

  describe('NetworkError', () => {
    it('should create network error', () => {
      const error = new NetworkError('Network failed');
      expect(error.message).toBe('Network failed');
      expect(error.name).toBe('NetworkError');
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError('Request timed out');
      expect(error.message).toBe('Request timed out');
      expect(error.name).toBe('TimeoutError');
    });
  });

  describe('createErrorFromResponse', () => {
    it('should create BadRequestError for 400', () => {
      const error = createErrorFromResponse('Bad request', 400, {});
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.statusCode).toBe(400);
    });

    it('should create UnauthorizedError for 401', () => {
      const error = createErrorFromResponse('Unauthorized', 401, {});
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.statusCode).toBe(401);
    });

    it('should create ForbiddenError for 403', () => {
      const error = createErrorFromResponse('Forbidden', 403, {});
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.statusCode).toBe(403);
    });

    it('should create NotFoundError for 404', () => {
      const error = createErrorFromResponse('Not found', 404, {});
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.statusCode).toBe(404);
    });

    it('should create UnprocessableEntityError for 422', () => {
      const error = createErrorFromResponse('Unprocessable', 422, {});
      expect(error).toBeInstanceOf(UnprocessableEntityError);
      expect(error.statusCode).toBe(422);
    });

    it('should create TooManyRequestsError for 429', () => {
      const error = createErrorFromResponse('Too many requests', 429, {});
      expect(error).toBeInstanceOf(TooManyRequestsError);
      expect(error.statusCode).toBe(429);
    });

    it('should create InternalServerError for 500', () => {
      const error = createErrorFromResponse('Internal error', 500, {});
      expect(error).toBeInstanceOf(InternalServerError);
      expect(error.statusCode).toBe(500);
    });

    it('should create ServiceUnavailableError for 503', () => {
      const error = createErrorFromResponse('Service unavailable', 503, {});
      expect(error).toBeInstanceOf(ServiceUnavailableError);
      expect(error.statusCode).toBe(503);
    });

    it('should create generic APIError for other status codes', () => {
      const error = createErrorFromResponse('Custom error', 418, {});
      expect(error).toBeInstanceOf(APIError);
      expect(error.statusCode).toBe(418);
    });
  });
});
