import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../db/schema/users.schema';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @Public()
  @Get('login')
  login(@Query('state') state: string, @Res() res: Response) {
    const authorizationUrl = this.authService.getAuthorizationUrl(state);
    return res.redirect(authorizationUrl);
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code) {
      throw new UnauthorizedException('Authorization code is required');
    }

    try {
      const { accessToken } = await this.authService.handleCallback(code);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${accessToken}&state=${state || ''}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('Callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/auth/error`);
    }
  }

  @Get('user')
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

  @Post('logout')
  async logout() {
    return {
      message: 'Logged out successfully',
    };
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
      throw new UnauthorizedException('This endpoint is only available in development');
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
      message: 'Test token generated. Use this token in Authorization header as: Bearer <token>',
    };
  }
}
