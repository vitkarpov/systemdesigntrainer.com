import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Custom throttler guard that tracks rate limits by user ID instead of IP address.
 * This ensures that rate limits apply per user regardless of their network or connection.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  /**
   * Override getTracker to use user ID instead of IP address for rate limiting.
   * This is called by the parent ThrottlerGuard to determine the tracking key.
   */
  protected async getTracker(req: Request): Promise<string> {
    // The user should be attached to the request by the JwtAuthGuard
    const user = (req as any).user;

    if (!user || !user.id) {
      // Fallback to IP-based tracking if user is not authenticated
      // This shouldn't happen for protected routes, but provides a safety net
      return req.ip || 'anonymous';
    }

    return `user-${user.id}`;
  }

  /**
   * Override generateKey to create a simpler key structure.
   * The suffix already includes the throttler name and context,
   * so we just return it directly for cleaner Redis keys.
   */
  protected generateKey(_context: ExecutionContext, suffix: string): string {
    // Return suffix which includes throttler context
    // This creates keys like: "user-123" for rate limiting
    return suffix;
  }
}
