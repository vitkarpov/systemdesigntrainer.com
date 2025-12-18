import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../db/db.module';
import { users, User, NewUser } from '../../db/schema/users.schema';

@Injectable()
export class UserService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async findByWorkosUserId(workosUserId: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.workosUserId, workosUserId))
      .limit(1);
    return result[0];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0];
  }

  async findById(id: number): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
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

  async updateLastLogin(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async upsertFromWorkos(workosUser: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
  }): Promise<User> {
    const existingUser = await this.findByWorkosUserId(workosUser.id);

    if (existingUser) {
      return this.updateUser(existingUser.id, {
        email: workosUser.email,
        name:
          workosUser.firstName && workosUser.lastName
            ? `${workosUser.firstName} ${workosUser.lastName}`
            : workosUser.firstName || existingUser.name,
        avatarUrl: workosUser.profilePictureUrl || existingUser.avatarUrl,
      });
    }

    return this.createUser({
      workosUserId: workosUser.id,
      email: workosUser.email,
      name:
        workosUser.firstName && workosUser.lastName
          ? `${workosUser.firstName} ${workosUser.lastName}`
          : workosUser.firstName || null,
      avatarUrl: workosUser.profilePictureUrl || null,
      subscriptionStatus: 'free',
      interviewsCompleted: 0,
      interviewsRemaining: 1,
    });
  }
}
