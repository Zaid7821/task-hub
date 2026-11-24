import type { ErrorResponse } from '@aionos/shared';
import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

const REASON: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

interface Normalized {
  status: number;
  message: string | string[];
  error?: string;
}

function fromHttpException(exception: HttpException): Normalized {
  const status = exception.getStatus();
  const body = exception.getResponse();
  if (typeof body === 'string') return { status, message: body };
  const { message, error } = body as { message?: unknown; error?: unknown };
  return {
    status,
    message:
      typeof message === 'string' || Array.isArray(message)
        ? (message as string | string[])
        : exception.message,
    error: typeof error === 'string' ? error : undefined,
  };
}

/** Known Prisma errors that are the client's fault become 404/409 instead of 500. */
function fromPrismaError(exception: Prisma.PrismaClientKnownRequestError): Normalized | null {
  switch (exception.code) {
    case 'P2002':
      return { status: HttpStatus.CONFLICT, message: 'A record with these values already exists' };
    case 'P2003':
      return {
        status: HttpStatus.CONFLICT,
        message: 'This record is referenced by other data and cannot be changed or deleted',
      };
    case 'P2025':
      return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
    default:
      return null;
  }
}

/** Every error leaves the API as { statusCode, message, error, timestamp, path }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let normalized: Normalized | null = null;
    if (exception instanceof HttpException) normalized = fromHttpException(exception);
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      normalized = fromPrismaError(exception);
    }
    if (!normalized) {
      // Never leak internals; log the full error server-side.
      this.logger.error(
        `${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      normalized = { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
    }

    const body: ErrorResponse = {
      statusCode: normalized.status,
      message: normalized.message,
      error: normalized.error ?? REASON[normalized.status] ?? 'Error',
      timestamp: new Date().toISOString(),
      path: request.originalUrl.split('?')[0] ?? request.originalUrl,
    };
    response.status(normalized.status).json(body);
  }
}
