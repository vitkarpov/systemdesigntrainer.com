import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import {
  AuthService,
  EmailVerificationRequiredException,
} from '../services/auth.service';
import { UserService } from '../services/user.service';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../../db/schema/users.schema';
import { UserResponseDto } from '../../interview/dto/responses.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Get('login')
  login(@Query('state') state: string, @Res() res: Response) {
    const authorizationUrl = this.authService.getAuthorizationUrl(state);
    return res.redirect(authorizationUrl);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Query('error_uri') errorUri: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Handle OAuth errors from WorkOS (e.g., user denied access)
    if (error) {
      console.warn('OAuth error:', {
        error,
        errorDescription,
        errorUri,
      });

      // Redirect to frontend error page with error details
      const errorParams = new URLSearchParams({
        error,
        ...(errorDescription && { error_description: errorDescription }),
      });
      return res.redirect(`${frontendUrl}/auth/error?${errorParams}`);
    }

    // Ensure code is present for successful flow
    if (!code) {
      console.error('Callback called without code or error');
      return res.redirect(
        `${frontendUrl}/auth/error?error=missing_code&error_description=No authorization code received`,
      );
    }

    try {
      const { accessToken, workosSessionId } =
        await this.authService.handleCallback(code);

      const cookieOptions = {
        httpOnly: true, // Prevents JavaScript access
        secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
        sameSite: 'lax' as const, // CSRF protection
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
        // Set domain for cross-subdomain access (api. and app.)
        domain:
          process.env.NODE_ENV === 'production'
            ? '.systemdesigntrainer.com'
            : undefined,
      };

      // Set access token cookie
      res.cookie('access_token', accessToken, cookieOptions);
      res.cookie('workos_session_id', workosSessionId, cookieOptions);

      // Redirect without token in URL
      const redirectUrl = `${frontendUrl}/auth/callback?state=${state || ''}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      // Handle email verification required error
      if (error instanceof EmailVerificationRequiredException) {
        const verificationParams = new URLSearchParams({
          email: error.email,
          verification_id: error.emailVerificationId,
          pending_token: error.pendingAuthenticationToken,
        });
        return res.redirect(
          `${frontendUrl}/auth/verify-email?${verificationParams}`,
        );
      }

      console.error('Authentication callback failed:', error.message || error);
      return res.redirect(
        `${frontendUrl}/auth/error?error=authentication_failed&error_description=Failed to complete authentication`,
      );
    }
  }

  @Get('user')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: 200,
    description: 'User information',
    type: UserResponseDto,
  })
  async getUser(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      subscriptionStatus: user.subscriptionStatus,
      interviewsCompleted: user.interviewsCompleted,
      interviewsRemaining: user.interviewsRemaining,
    };
  }

  @Get('logout')
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 302, description: 'Redirects after logout' })
  async logout(@Res() res: Response) {
    const sessionId = res.req.cookies?.['workos_session_id'];

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      // Must match domain from cookie creation
      domain:
        process.env.NODE_ENV === 'production'
          ? '.systemdesigntrainer.com'
          : undefined,
    };

    // Clear both cookies
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('workos_session_id', cookieOptions);

    if (!sessionId) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(frontendUrl);
    }

    const workosLogoutUrl = this.authService.getLogoutUrl(sessionId);
    return res.redirect(workosLogoutUrl);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Get('verify-email')
  async verifyEmail(
    @Query('code') code: string,
    @Query('pending_token') pendingToken: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Validate required parameters
    if (!code || !pendingToken) {
      return res.redirect(
        `${frontendUrl}/auth/error?error=missing_parameters&error_description=Verification code and pending token are required`,
      );
    }

    try {
      const { accessToken, workosSessionId } =
        await this.authService.completeEmailVerification(code, pendingToken);

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
        domain:
          process.env.NODE_ENV === 'production'
            ? '.systemdesigntrainer.com'
            : undefined,
      };

      // Set access token cookie
      res.cookie('access_token', accessToken, cookieOptions);
      res.cookie('workos_session_id', workosSessionId, cookieOptions);

      // Redirect to success page
      return res.redirect(`${frontendUrl}/auth/callback`);
    } catch (error) {
      console.error(
        'Email verification callback failed:',
        error.message || error,
      );
      return res.redirect(
        `${frontendUrl}/auth/error?error=verification_failed&error_description=Failed to verify email`,
      );
    }
  }

  @Public()
  @Get('status')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * DEV ONLY: Generate a test token for API testing
   * This endpoint should be disabled in production
   */
  @Public()
  @Post('dev/test-token')
  async generateTestToken() {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException(
        'This endpoint is only available in development',
      );
    }

    const testUser = await this.userService.findByEmail('test@example.com');
    const token = this.authService.generateAccessToken(testUser);

    return {
      accessToken: token,
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
      },
      message:
        'Test token generated. Use this token in Authorization header as: Bearer <token>',
    };
  }
}
