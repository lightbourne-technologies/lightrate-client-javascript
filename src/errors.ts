/**
 * Error classes for the LightRate client
 */

export class LightRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LightRateError';
  }
}

export class ConfigurationError extends LightRateError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class AuthenticationError extends LightRateError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class APIError extends LightRateError {
  public readonly statusCode?: number;
  public readonly responseBody?: any;

  constructor(message: string, statusCode?: number, responseBody?: any) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class BadRequestError extends APIError {
  constructor(message: string, statusCode?: number, responseBody?: any) {
    super(message, statusCode, responseBody);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string, statusCode?: number, responseBody?: any) {
    super(message, statusCode, responseBody);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string, statusCode?: number, responseBody?: any) {
    super(message, statusCode, responseBody);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends APIError {
  constructor(message: string, statusCode?: number, responseBody?: any) {
    super(message, statusCode, responseBody);
    this.name = 'NotFoundError';
  }
}

export class UnprocessableEntityError extends APIError {
  constructor(message: string, statusCode?: number, responseBody?: any) {
    super(message, statusCode, responseBody);
    this.name = 'UnprocessableEntityError';
  }
}

export class TooManyRequestsError extends APIError {
  constructor(message: string, statusCode?: number, responseBody?: any) {
    super(message, statusCode, responseBody);
    this.name = 'TooManyRequestsError';
  }
}

export class InternalServerError extends APIError {
  constructor(message: string, statusCode?: number, responseBody?: any) {
    super(message, statusCode, responseBody);
    this.name = 'InternalServerError';
  }
}

export class ServiceUnavailableError extends APIError {
  constructor(message: string, statusCode?: number, responseBody?: any) {
    super(message, statusCode, responseBody);
    this.name = 'ServiceUnavailableError';
  }
}

export class NetworkError extends LightRateError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends LightRateError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Factory function to create appropriate error based on HTTP status code
 */
export function createErrorFromResponse(
  message: string,
  statusCode: number,
  responseBody?: any
): APIError {
  switch (statusCode) {
    case 400:
      return new BadRequestError(message, statusCode, responseBody);
    case 401:
      return new UnauthorizedError(message, statusCode, responseBody);
    case 403:
      return new ForbiddenError(message, statusCode, responseBody);
    case 404:
      return new NotFoundError(message, statusCode, responseBody);
    case 422:
      return new UnprocessableEntityError(message, statusCode, responseBody);
    case 429:
      return new TooManyRequestsError(message, statusCode, responseBody);
    case 500:
      return new InternalServerError(message, statusCode, responseBody);
    case 503:
      return new ServiceUnavailableError(message, statusCode, responseBody);
    default:
      return new APIError(message, statusCode, responseBody);
  }
}
