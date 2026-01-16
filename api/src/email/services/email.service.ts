import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as Sentry from '@sentry/nestjs';
import { UserService } from '../../auth/services/user.service';
import * as fs from 'fs';
import * as path from 'path';

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
    const accessKeyId = this.configService.get<string>('AWS_SES_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SES_SECRET_ACCESS_KEY',
    );

    this.fromEmail =
      this.configService.get<string>('AWS_SES_FROM_EMAIL') ||
      'noreply@systemdesigntrainer.com';
    this.appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    this.sesClient = new SESClient({
      region: region || 'us-east-1',
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });
  }

  async sendFeedbackReadyEmail(
    userId: number,
    sessionId: number,
  ): Promise<void> {
    try {
      // Fetch user from database
      const user = await this.userService.findById(userId);

      if (!user) {
        this.logger.warn(`User ${userId} not found, skipping email`);
        return;
      }

      if (!user.email) {
        this.logger.warn(`User ${userId} has no email address, skipping email`);
        return;
      }

      // Construct feedback URL
      const feedbackUrl = `${this.appUrl}/feedback/${sessionId}`;

      // Load email template
      const templatePath = path.join(
        __dirname,
        '..',
        '..',
        'email',
        'templates',
        'feedback-ready.html',
      );
      let htmlBody = fs.readFileSync(templatePath, 'utf-8');

      // Replace placeholders
      htmlBody = htmlBody.replace('{{FEEDBACK_URL}}', feedbackUrl);
      htmlBody = htmlBody.replace('{{USER_NAME}}', user.name || 'there');

      // Only send email via SES in production
      if (!this.isProduction) {
        this.logger.log(
          `[Non-Production] Would send feedback ready email to user ${userId} (${user.email}) for session ${sessionId}. URL: ${feedbackUrl}`,
        );
        return;
      }

      // Send email via SES
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
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
          },
        },
      });

      await this.sesClient.send(command);

      this.logger.log(
        `Feedback ready email sent to user ${userId} (${user.email}) for session ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send feedback ready email to user ${userId} for session ${sessionId}`,
        error,
      );
      Sentry.captureException(error, {
        extra: {
          userId,
          sessionId,
          context: 'sendFeedbackReadyEmail',
        },
      });
      throw error;
    }
  }
}
