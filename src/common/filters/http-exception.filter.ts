import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

const ERROR_MESSAGE_NOT_FOUND = '내역을 찾을 수 없어요.';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'object' && payload !== null && 'message' in payload) {
        const msg = (payload as { message: string | string[] }).message;
        message = Array.isArray(msg) ? msg[0] ?? 'Bad Request' : msg;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.stack);
    } else {
      message = 'Internal server error';
    }

    res.status(status).json({ error: message });
  }
}

export function getNotFoundMessage(): string {
  return ERROR_MESSAGE_NOT_FOUND;
}
