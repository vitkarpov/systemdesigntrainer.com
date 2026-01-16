import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { DATABASE_CONNECTION } from '../../../db/db.module';
import { User, NewUser } from '../../../db/schema/users.schema';

describe('UserService', () => {
  let service: UserService;
  let mockDb: any;

  const mockUser: User = {
    id: 1,
    workosUserId: 'user_123',
    githubId: null,
    githubUsername: null,
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    targetLevel: null,
    subscriptionStatus: 'free',
    subscriptionExpiresAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    interviewsCompleted: 0,
    interviewsRemaining: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByWorkosUserId', () => {
    it('should return user when found', async () => {
      mockDb.limit.mockResolvedValue([mockUser]);

      const result = await service.findByWorkosUserId('user_123');

      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(service.findByWorkosUserId('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByWorkosUserId('nonexistent')).rejects.toThrow(
        'User with WorkOS ID nonexistent not found',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      mockDb.limit.mockResolvedValue([mockUser]);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(
        service.findByEmail('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findByEmail('nonexistent@example.com'),
      ).rejects.toThrow('User with email nonexistent@example.com not found');
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockDb.limit.mockResolvedValue([mockUser]);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow(
        'User with ID 999 not found',
      );
    });
  });

  describe('createUser', () => {
    it('should create and return user', async () => {
      const newUser: NewUser = {
        workosUserId: 'user_456',
        email: 'new@example.com',
        name: 'New User',
        avatarUrl: null,
        subscriptionStatus: 'free',
        stripeCustomerId: null,
        interviewsCompleted: 0,
        interviewsRemaining: 1,
      };

      const createdUser: User = {
        id: 2,
        workosUserId: 'user_456',
        githubId: null,
        githubUsername: null,
        email: 'new@example.com',
        name: 'New User',
        avatarUrl: null,
        targetLevel: null,
        subscriptionStatus: 'free',
        subscriptionExpiresAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        interviewsCompleted: 0,
        interviewsRemaining: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      mockDb.returning.mockResolvedValue([createdUser]);

      const result = await service.createUser(newUser);

      expect(result).toEqual(createdUser);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(newUser);
      expect(mockDb.returning).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update and return user', async () => {
      const updateData: Partial<NewUser> = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const updatedUser: User = {
        ...mockUser,
        ...updateData,
        updatedAt: new Date(),
      };

      mockDb.returning.mockResolvedValue([updatedUser]);

      const result = await service.updateUser(1, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updateData,
          updatedAt: expect.any(Date),
        }),
      );
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
    });
  });

  describe('updateLastLogin', () => {
    it('should update lastLoginAt timestamp', async () => {
      mockDb.where.mockResolvedValue(undefined);

      await service.updateLastLogin(1);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('upsertFromWorkos', () => {
    it('should update existing user', async () => {
      const workosUser = {
        id: 'user_123',
        email: 'updated@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePictureUrl: 'https://example.com/pic.jpg',
      };

      // Mock findByWorkosUserId to return existing user
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Mock updateUser
      const updatedUser: User = {
        id: mockUser.id,
        workosUserId: mockUser.workosUserId,
        githubId: null,
        githubUsername: null,
        email: workosUser.email,
        name: 'John Doe',
        avatarUrl: workosUser.profilePictureUrl,
        targetLevel: null,
        subscriptionStatus: 'free',
        subscriptionExpiresAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        interviewsCompleted: 0,
        interviewsRemaining: 1,
        createdAt: mockUser.createdAt,
        updatedAt: new Date(),
        lastLoginAt: null,
      };
      mockDb.returning.mockResolvedValue([updatedUser]);

      const result = await service.upsertFromWorkos(workosUser);

      expect(result).toEqual(updatedUser);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should create new user when not found', async () => {
      const workosUser = {
        id: 'user_new',
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        profilePictureUrl: 'https://example.com/jane.jpg',
      };

      // Mock findByWorkosUserId to throw NotFoundException
      mockDb.limit.mockResolvedValueOnce([]);

      // Mock createUser
      const newUser: User = {
        id: 3,
        workosUserId: workosUser.id,
        githubId: null,
        githubUsername: null,
        email: workosUser.email,
        name: 'Jane Smith',
        avatarUrl: workosUser.profilePictureUrl,
        targetLevel: null,
        subscriptionStatus: 'free',
        subscriptionExpiresAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        interviewsCompleted: 0,
        interviewsRemaining: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };
      mockDb.returning.mockResolvedValue([newUser]);

      const result = await service.upsertFromWorkos(workosUser);

      expect(result).toEqual(newUser);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle user with only firstName', async () => {
      const workosUser = {
        id: 'user_new',
        email: 'new@example.com',
        firstName: 'Jane',
      };

      // Mock findByWorkosUserId to throw NotFoundException
      mockDb.limit.mockResolvedValueOnce([]);

      // Mock createUser
      const newUser: User = {
        id: 3,
        workosUserId: workosUser.id,
        githubId: null,
        githubUsername: null,
        email: workosUser.email,
        name: 'Jane',
        avatarUrl: null,
        targetLevel: null,
        subscriptionStatus: 'free',
        subscriptionExpiresAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        interviewsCompleted: 0,
        interviewsRemaining: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };
      mockDb.returning.mockResolvedValue([newUser]);

      const result = await service.upsertFromWorkos(workosUser);

      expect(result.name).toBe('Jane');
    });

    it('should rethrow non-NotFoundException errors', async () => {
      const workosUser = {
        id: 'user_123',
        email: 'test@example.com',
      };

      const dbError = new Error('Database connection failed');
      mockDb.limit.mockRejectedValueOnce(dbError);

      await expect(service.upsertFromWorkos(workosUser)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
