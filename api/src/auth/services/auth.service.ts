import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WorkOS } from '@workos-inc/node';
import * as jwt from 'jsonwebtoken';
import { UserService } from './user.service';
import { User } from '../../../db/schema/users.schema';
import { OAuthProvider } from '../auth.types';

export interface JwtPayload {
  userId: number;
  email: string;
  workosUserId: string;
}

export class EmailVerificationRequiredException extends Error {
  constructor(
    public email: string,
    public pendingAuthenticationToken: string,
    public emailVerificationId: string,
  ) {
    super('Email verification required');
    this.name = 'EmailVerificationRequiredException';
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private workos: WorkOS;
  private jwtSecret: string;
  private clientId: string;
  private redirectUri: string;

  constructor(private userService: UserService) {
    const apiKey = process.env.WORKOS_API_KEY;
    this.clientId = process.env.WORKOS_CLIENT_ID;
    this.jwtSecret = process.env.JWT_SECRET;
    this.redirectUri = process.env.WORKOS_REDIRECT_URI;

    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET is not set');
    }

    if (this.jwtSecret.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 32',
      );
    }

    if (!this.redirectUri) {
      throw new Error('WORKOS_REDIRECT_URI is not set');
    }

    if (!apiKey) {
      throw new Error('WORKOS_API_KEY is not set');
    }

    if (!this.clientId) {
      throw new Error('WORKOS_CLIENT_ID is not set');
    }

    this.workos = new WorkOS(apiKey);
  }

  getAuthorizationUrl(
    provider: OAuthProvider = 'GitHubOAuth',
    state?: string,
  ): string {
    const authorizationUrl = this.workos.userManagement.getAuthorizationUrl({
      provider,
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      state: state || '',
    });

    return authorizationUrl;
  }

  getLogoutUrl(sessionId: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    return this.workos.userManagement.getLogoutUrl({
      sessionId,
      returnTo: frontendUrl,
    });
  }

  private extractSessionIdFromAccessToken(accessToken: string): string | null {
    try {
      // Decode the JWT without verifying (we just need to read the sid claim)
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf8'),
      );

      return payload.sid || null;
    } catch (error) {
      this.logger.error('Error extracting session ID from token:', error);
      return null;
    }
  }

  async handleCallback(code: string): Promise<{
    user: User;
    accessToken: string;
    workosSessionId: string | null;
  }> {
    try {
      const response = await this.workos.userManagement.authenticateWithCode({
        clientId: this.clientId,
        code,
      });

      const workosUser = response.user;
      const workosAccessToken = response.accessToken;

      const workosSessionId =
        this.extractSessionIdFromAccessToken(workosAccessToken);

      const user = await this.userService.upsertFromWorkos(workosUser);

      const accessToken = this.generateAccessToken(user);

      return { user, accessToken, workosSessionId };
    } catch (error) {
      // Check if this is an email verification required error
      if (
        error?.status === 403 &&
        error?.rawData?.code === 'email_verification_required'
      ) {
        this.logger.log(
          `Email verification required for: ${error.rawData.email} (verification_id: ${error.rawData.email_verification_id})`,
        );
        throw new EmailVerificationRequiredException(
          error.rawData.email,
          error.rawData.pending_authentication_token,
          error.rawData.email_verification_id,
        );
      }

      // Log unexpected authentication errors with details
      this.logger.error('WorkOS authentication failed:', {
        status: error?.status,
        code: error?.rawData?.code,
        message: error?.message || error,
      });

      throw new UnauthorizedException('Authentication failed');
    }
  }

  generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      workosUserId: user.workosUserId,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '7d',
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async getUserFromToken(token: string): Promise<User> {
    const payload = this.verifyAccessToken(token);
    return await this.userService.findById(payload.userId);
  }

  async completeEmailVerification(
    code: string,
    pendingAuthenticationToken: string,
  ): Promise<{
    user: User;
    accessToken: string;
    workosSessionId: string | null;
  }> {
    try {
      const response =
        await this.workos.userManagement.authenticateWithEmailVerification({
          clientId: this.clientId,
          code,
          pendingAuthenticationToken,
        });

      const workosUser = response.user;
      const workosAccessToken = response.accessToken;

      const workosSessionId =
        this.extractSessionIdFromAccessToken(workosAccessToken);

      const user = await this.userService.upsertFromWorkos(workosUser);

      const accessToken = this.generateAccessToken(user);

      return { user, accessToken, workosSessionId };
    } catch (error) {
      this.logger.error('WorkOS email verification failed:', {
        status: error?.status,
        code: error?.rawData?.code,
        message: error?.message || error,
      });
      throw new UnauthorizedException('Email verification failed');
    }
  }
}
