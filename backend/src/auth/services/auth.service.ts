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
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.redirectUri = process.env.WORKOS_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

    if (!apiKey || !this.clientId) {
      throw new Error('WORKOS_API_KEY and WORKOS_CLIENT_ID must be set');
    }

    this.workos = new WorkOS(apiKey);
  }

  getAuthorizationUrl(state?: string): string {
    const authorizationUrl = this.workos.userManagement.getAuthorizationUrl({
      provider: 'authkit',
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      state: state || '',
    });

    return authorizationUrl;
  }

  async handleCallback(code: string): Promise<{ user: User; accessToken: string }> {
    try {
      const { user: workosUser } = await this.workos.userManagement.authenticateWithCode({
        clientId: this.clientId,
        code,
      });

      const user = await this.userService.upsertFromWorkos({
        id: workosUser.id,
        email: workosUser.email,
        firstName: workosUser.firstName,
        lastName: workosUser.lastName,
        profilePictureUrl: workosUser.profilePictureUrl,
      });

      await this.userService.updateLastLogin(user.id);

      const accessToken = this.generateAccessToken(user);

      return { user, accessToken };
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
