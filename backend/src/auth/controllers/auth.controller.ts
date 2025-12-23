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
import { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../db/schema/users.schema';
import { UserResponseDto } from '../../interview/dto/responses.dto';

@ApiTags('auth')
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

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
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
