/**
 * Error handling utilities
 */

export class GrampsAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string
  ) {
    super(message);
    this.name = "GrampsAPIError";
  }
}

export class AuthenticationError extends GrampsAPIError {
  constructor(message: string = "Authentication failed") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends GrampsAPIError {
  constructor(entityType: string, identifier: string) {
    super(`${entityType} not found: ${identifier}`, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function formatErrorForMCP(error: unknown): string {
  if (error instanceof GrampsAPIError) {
    let message = error.message;
    if (error.statusCode) {
      message = `[${error.statusCode}] ${message}`;
    }
    if (error.endpoint) {
      message = `${message} (endpoint: ${error.endpoint})`;
    }
    return message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
