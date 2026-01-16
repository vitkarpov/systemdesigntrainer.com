import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { UserService } from '../../auth/services/user.service';
import { getFeedbackReadyEmailBody } from '../utils/email-templates.util';
import { User } from 'db/schema';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly fromEmail: string;
  private readonly appUrl: string;
  private readonly isProduction: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const region = this.configService.get<string>('AWS_SES_REGION');

    this.fromEmail =
      this.configService.get<string>('AWS_SES_FROM_EMAIL') ||
      'noreply@systemdesigntrainer.com';
    this.appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    this.sesClient = new SESClient({
      region: region || 'us-east-1',
    });
  }

  async sendFeedbackReadyEmail(
    userId: number,
    sessionId: number,
  ): Promise<void> {
    const user = await this.userService.findById(userId);

    if (!user.email) {
      this.logger.warn(
        `User ${user.workosUserId} has no email address, skipping email`,
      );
      return;
    }

    if (!this.isProduction) {
      this.logger.log(
        `Would send feedback ready email to user ${userId} (${user.email}) for session ${sessionId}`,
      );
      return;
    }

    const feedbackUrl = `${this.appUrl}/feedback/${sessionId}`;
    const emailBody = getFeedbackReadyEmailBody(user.name, feedbackUrl);

    await this.sendEmail(user, emailBody);

    this.logger.log(
      `Feedback ready email sent to user ${userId} (${user.email}) for session ${sessionId}`,
    );
  }

  private async sendEmail(user: User, emailBody: string): Promise<void> {
    const command = new SendEmailCommand({
      Source: this.fromEmail,
      Destination: {
        ToAddresses: [user.email],
      },
      Message: {
        Subject: {
          Data: 'Your Interview Feedback is Ready',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: emailBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await this.sesClient.send(command);
  }
}
