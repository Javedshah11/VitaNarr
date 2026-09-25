import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR)
      this.logger.error(
        'Unhandled request error',
        exception instanceof Error ? exception.stack : undefined,
      );
    response.status(status).json({
      statusCode: status,
      message:
        status >= 500
          ? 'Internal server error'
          : this.getPublicMessage(exception),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private getPublicMessage(exception: unknown): string | object {
    return exception instanceof HttpException
      ? exception.getResponse()
      : 'Request failed';
  }
}
