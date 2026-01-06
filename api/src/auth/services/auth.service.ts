import { Injectable, UnauthorizedException } from '@nestjs/common';
import { WorkOS } from '@workos-inc/node';
import * as jwt from 'jsonwebtoken';
import { UserService } from './user.service';
import { User } from '../../db/schema/users.schema';

export interface JwtPayload {
  userId: number;
  email: string;
  workosUserId: string;
}

@Injectable()
export class AuthService {
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

  getAuthorizationUrl(state?: string): string {
    const authorizationUrl = this.workos.userManagement.getAuthorizationUrl({
      provider: 'GitHubOAuth',
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
      console.error('Error extracting session ID from token:', error);
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

      const user = await this.userService.upsertFromWorkos({
        id: workosUser.id,
        email: workosUser.email,
        firstName: workosUser.firstName,
        lastName: workosUser.lastName,
        profilePictureUrl: workosUser.profilePictureUrl,
      });

      await this.userService.updateLastLogin(user.id);

      const accessToken = this.generateAccessToken(user);

      return { user, accessToken, workosSessionId };
    } catch (error) {
      console.error('WorkOS authentication error:', error);
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
    const user = await this.userService.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
