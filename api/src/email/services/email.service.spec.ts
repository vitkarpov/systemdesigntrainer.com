import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { UserService } from '../../auth/services/user.service';
import { SESClient } from '@aws-sdk/client-ses';

describe('EmailService', () => {
  let service: EmailService;
  let userService: jest.Mocked<UserService>;
  let sesClient: jest.Mocked<SESClient>;

  const mockConfigGet = jest.fn();
  const mockUserServiceFindById = jest.fn();
  const mockSesSend = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigGet.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        AWS_SES_REGION: 'eu-west-1',
        AWS_SES_FROM_EMAIL: 'noreply@systemdesigntrainer.com',
        APP_URL: 'https://app.systemdesigntrainer.com',
        NODE_ENV: 'production',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: mockConfigGet,
          },
        },
        {
          provide: UserService,
          useValue: {
            findById: mockUserServiceFindById,
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    userService = module.get(UserService);

    sesClient = (service as any).sesClient;
    sesClient.send = mockSesSend;
  });

  describe('sendFeedbackReadyEmail', () => {
    it('should send email via SES in production', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'John Doe',
        workosUserId: 'user_123',
      };

      mockUserServiceFindById.mockResolvedValue(mockUser);
      mockSesSend.mockResolvedValue({});

      await service.sendFeedbackReadyEmail(1, 100);

      expect(userService.findById).toHaveBeenCalledWith(1);
      expect(sesClient.send).toHaveBeenCalledTimes(1);
    });

    it('should not send email if user has no email address', async () => {
      const mockUser = {
        id: 1,
        email: null,
        name: 'John Doe',
      };

      mockUserServiceFindById.mockResolvedValue(mockUser);

      await service.sendFeedbackReadyEmail(1, 100);

      expect(userService.findById).toHaveBeenCalledWith(1);
      expect(sesClient.send).not.toHaveBeenCalled();
    });

    it('should not send email in non-production environment', async () => {
      mockConfigGet.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          AWS_SES_REGION: 'eu-west-1',
          AWS_SES_FROM_EMAIL: 'noreply@systemdesigntrainer.com',
          APP_URL: 'http://localhost:5173',
          NODE_ENV: 'development',
        };
        return config[key];
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: mockConfigGet,
            },
          },
          {
            provide: UserService,
            useValue: {
              findById: mockUserServiceFindById,
            },
          },
        ],
      }).compile();

      const nonProdService = module.get<EmailService>(EmailService);
      const nonProdSesClient = (nonProdService as any).sesClient;
      nonProdSesClient.send = mockSesSend;

      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'John Doe',
      };

      mockUserServiceFindById.mockResolvedValue(mockUser);

      await nonProdService.sendFeedbackReadyEmail(1, 100);

      expect(userService.findById).toHaveBeenCalledWith(1);
      expect(nonProdSesClient.send).not.toHaveBeenCalled();
    });

    it('should rethrow error on SES failure', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'John Doe',
      };
      const mockError = new Error('SES send failed');

      mockUserServiceFindById.mockResolvedValue(mockUser);
      mockSesSend.mockRejectedValue(mockError);

      await expect(service.sendFeedbackReadyEmail(1, 100)).rejects.toThrow(
        'SES send failed',
      );
    });
  });
});
