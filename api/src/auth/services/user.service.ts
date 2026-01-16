import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { AuthenticationResponse } from '@workos-inc/node';
import { DATABASE_CONNECTION } from '../../../db/db.module';
import { users, User, NewUser } from '../../../db/schema/users.schema';
import { buildUserNameFromWorkos } from '../utils/user-name.util';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async findByWorkosUserId(workosUserId: string): Promise<User> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.workosUserId, workosUserId))
      .limit(1);

    if (!result[0]) {
      throw new NotFoundException(
        `User with WorkOS ID ${workosUserId} not found`,
      );
    }

    return result[0];
  }

  async findByEmail(email: string): Promise<User> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!result[0]) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return result[0];
  }

  async findById(id: number): Promise<User> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!result[0]) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return result[0];
  }

  async createUser(userData: NewUser): Promise<User> {
    const result = await this.db.insert(users).values(userData).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<NewUser>): Promise<User> {
    const result = await this.db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async upsertFromWorkos(
    workosUser: AuthenticationResponse['user'],
  ): Promise<User> {
    try {
      const existingUser = await this.findByWorkosUserId(workosUser.id);

      this.logger.log(
        `User logged in: ${existingUser.email} (ID: ${existingUser.id})`,
      );

      return this.updateUser(existingUser.id, {
        email: workosUser.email,
        name: buildUserNameFromWorkos(workosUser, existingUser.name),
        avatarUrl: workosUser.profilePictureUrl || existingUser.avatarUrl,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        const newUser = await this.createUser({
          workosUserId: workosUser.id,
          email: workosUser.email,
          name: buildUserNameFromWorkos(workosUser),
          avatarUrl: workosUser.profilePictureUrl || null,
          subscriptionStatus: 'free',
          interviewsCompleted: 0,
          interviewsRemaining: 1,
        });

        this.logger.log(
          `New user registered: ${newUser.email} (ID: ${newUser.id})`,
        );

        return newUser;
      }
      throw error;
    }
  }
}
