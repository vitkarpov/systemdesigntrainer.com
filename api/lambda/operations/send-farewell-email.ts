import { isNotNull } from 'drizzle-orm';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { users } from '../../db/schema/users.schema';
import {
  FAREWELL_EMAIL_SUBJECT,
  getFarewellEmailBody,
} from '../utils/farewell-email';
import type {
  SendFarewellEmailPayload,
  SendFarewellEmailResponse,
} from '../types/operations.types';
import type { Database } from '../db-connection';

// SES client (reused across warm invocations)
let sesClient: SESClient | null = null;

function getSesClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({
      region:
        process.env.AWS_SES_REGION || process.env.AWS_REGION || 'eu-west-1',
    });
  }
  return sesClient;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send a one-off farewell / thank-you email to every registered user.
 *
 * Users are processed in batches to respect SES sending limits. Each recipient
 * is sent an individual message so addresses are never exposed to one another.
 */
export async function sendFarewellEmail(
  db: Database,
  payload: SendFarewellEmailPayload = {},
): Promise<SendFarewellEmailResponse> {
  const startTime = Date.now();

  const dryRun = payload.dryRun ?? false;
  const batchSize = Math.max(1, payload.batchSize ?? 10);
  const delayMs = Math.max(0, payload.delayMs ?? 1000);

  const fromEmail =
    process.env.AWS_SES_FROM_EMAIL || 'noreply@systemdesigntrainer.com';

  console.log('Executing send-farewell-email operation', {
    dryRun,
    batchSize,
    delayMs,
    limit: payload.limit,
    fromEmail,
    timestamp: new Date().toISOString(),
  });

  try {
    // When testEmail is provided, send only to that address (live test) and
    // skip the user table entirely. Otherwise email all registered users.
    let recipients: Array<{
      id: number;
      email: string | null;
      name: string | null;
    }>;

    if (payload.testEmail) {
      recipients = [{ id: 0, email: payload.testEmail, name: null }];
    } else {
      const baseQuery = db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(isNotNull(users.email));

      recipients =
        typeof payload.limit === 'number' && payload.limit > 0
          ? await baseQuery.limit(payload.limit)
          : await baseQuery;
    }

    const totalUsers = recipients.length;
    const client = getSesClient();

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          if (!user.email) {
            skipped += 1;
            return;
          }

          if (dryRun) {
            sent += 1;
            return;
          }

          try {
            await client.send(
              new SendEmailCommand({
                Source: fromEmail,
                Destination: { ToAddresses: [user.email] },
                Message: {
                  Subject: {
                    Data: FAREWELL_EMAIL_SUBJECT,
                    Charset: 'UTF-8',
                  },
                  Body: {
                    Text: {
                      Data: getFarewellEmailBody(user.name),
                      Charset: 'UTF-8',
                    },
                  },
                },
              }),
            );
            sent += 1;
          } catch (error) {
            failed += 1;
            const message =
              error instanceof Error ? error.message : 'Unknown SES error';
            failures.push({ email: user.email, error: message });
            console.error('Failed to send farewell email', {
              userId: user.id,
              email: user.email,
              error: message,
            });
          }
        }),
      );

      // Throttle between batches to stay within SES rate limits.
      if (delayMs > 0 && i + batchSize < recipients.length) {
        await sleep(delayMs);
      }
    }

    const duration = Date.now() - startTime;
    console.log('send-farewell-email operation completed', {
      totalUsers,
      sent,
      skipped,
      failed,
      dryRun,
      duration,
    });

    return {
      success: true,
      operation: 'send-farewell-email',
      data: {
        totalUsers,
        sent,
        skipped,
        failed,
        dryRun,
        failures,
      },
    };
  } catch (error) {
    console.error('Error in send-farewell-email operation:', error);

    return {
      success: false,
      operation: 'send-farewell-email',
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
