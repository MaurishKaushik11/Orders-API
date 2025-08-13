import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const requestId = uuidv4();
    request.requestId = requestId;
    response.setHeader('X-Request-ID', requestId);

    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const start = Date.now();

    this.logger.log(
      `${method} ${url} - ${ip} - ${userAgent} [RequestID: ${requestId}]`,
    );

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = response;
        const duration = Date.now() - start;
        
        this.logger.log(
          `${method} ${url} ${statusCode} - ${duration}ms [RequestID: ${requestId}]`,
        );
      }),
    );
  }
}