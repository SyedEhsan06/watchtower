import type { ErrorCode } from "@watchtower/shared";

export class ApiError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function unauthorized(message = "Authentication required"): ApiError {
  return new ApiError("UNAUTHORIZED", message, 401);
}

export function notFound(message = "Resource not found"): ApiError {
  return new ApiError("NOT_FOUND", message, 404);
}

export function badRequest(message: string, details?: Record<string, unknown>): ApiError {
  return new ApiError("VALIDATION_ERROR", message, 400, details);
}
