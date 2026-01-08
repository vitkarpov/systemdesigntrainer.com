import { Injectable, Inject, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../db/db.module';
import * as schema from '../../db/schema';
import { ProductTier } from '../dto/checkout.dto';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  // Map product tiers to Stripe price IDs from environment
  private readonly tierToPriceId: Record<ProductTier, string> = {
    [ProductTier.THREE_INTERVIEWS]: process.env.STRIPE_PRICE_3_INTERVIEWS,
    [ProductTier.FIVE_INTERVIEWS]: process.env.STRIPE_PRICE_5_INTERVIEWS,
    [ProductTier.UNLIMITED]: process.env.STRIPE_PRICE_UNLIMITED,
  };

  // Product configurations by tier
  private readonly tierConfigs: Record<
    ProductTier,
    {
      productType: '3_interviews' | '5_interviews' | 'unlimited';
      interviewsGranted: number;
    }
  > = {
    [ProductTier.THREE_INTERVIEWS]: {
      productType: '3_interviews' as const,
      interviewsGranted: 3,
    },
    [ProductTier.FIVE_INTERVIEWS]: {
      productType: '5_interviews' as const,
      interviewsGranted: 5,
    },
    [ProductTier.UNLIMITED]: {
      productType: 'unlimited' as const,
      interviewsGranted: 9999,
    },
  };

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<typeof schema>,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
    });
  }

  /**
   * Create a Stripe Checkout Session for purchasing interviews
   */
  async createCheckoutSession(
    userId: number,
    email: string,
    productTier: ProductTier,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    this.logger.log(
      `Creating checkout session for user ${userId}, tier ${productTier}`,
    );

    // Get configuration for this tier
    const tierConfig = this.tierConfigs[productTier];
    if (!tierConfig) {
      throw new Error(`Invalid product tier: ${productTier}`);
    }

    // Map tier to Stripe price ID
    const stripePriceId = this.tierToPriceId[productTier];
    if (!stripePriceId) {
      throw new Error(
        `Stripe price ID not configured for tier: ${productTier}`,
      );
    }

    // Determine if this is a subscription or one-time payment
    const isSubscription = tierConfig.productType === 'unlimited';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      metadata: {
        userId: userId.toString(),
        productType: tierConfig.productType,
        interviewsGranted: tierConfig.interviewsGranted.toString(),
      },
    };

    if (isSubscription) {
      sessionParams.subscription_data = {
        metadata: {
          userId: userId.toString(),
          productType: tierConfig.productType,
        },
      };
    } else {
      sessionParams.payment_intent_data = {
        metadata: {
          userId: userId.toString(),
          productType: tierConfig.productType,
          interviewsGranted: tierConfig.interviewsGranted.toString(),
        },
      };
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    this.logger.log(`Checkout session created: ${session.id}`);

    return session;
  }

  /**
   * Handle successful payment - grant interviews to user
   */
  async handleSuccessfulPayment(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;

    this.logger.log(`Processing successful payment for session ${session.id}`);

    const userId = parseInt(session.metadata.userId);
    const productType = session.metadata.productType as
      | '3_interviews'
      | '5_interviews'
      | 'unlimited';
    const interviewsGranted = parseInt(session.metadata.interviewsGranted);

    // Get payment intent or subscription ID
    const paymentIntentId = session.payment_intent as string;
    const subscriptionId = session.subscription as string;

    // Create purchase record
    await this.db.insert(schema.purchases).values({
      userId,
      stripePaymentIntentId: paymentIntentId || null,
      stripeSubscriptionId: subscriptionId || null,
      stripePriceId: session.line_items?.data[0]?.price?.id || '',
      productType,
      interviewsGranted,
      amountPaid: session.amount_total || 0,
    });

    // Update user's interview count and subscription status
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) {
      this.logger.error(`User ${userId} not found`);
      return;
    }

    if (productType === 'unlimited') {
      // Set unlimited subscription
      await this.db
        .update(schema.users)
        .set({
          subscriptionStatus: 'unlimited',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));

      this.logger.log(`User ${userId} upgraded to unlimited subscription`);
    } else {
      // Add interviews to balance
      const newBalance = (user.interviewsRemaining || 0) + interviewsGranted;
      await this.db
        .update(schema.users)
        .set({
          interviewsRemaining: newBalance,
          stripeCustomerId: session.customer as string,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));

      this.logger.log(
        `User ${userId} received ${interviewsGranted} interviews. New balance: ${newBalance}`,
      );
    }
  }

  /**
   * Handle subscription cancellation
   */
  async handleSubscriptionCanceled(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;

    this.logger.log(`Processing subscription cancellation: ${subscription.id}`);

    const userId = parseInt(subscription.metadata.userId);

    // Downgrade user to free tier
    await this.db
      .update(schema.users)
      .set({
        subscriptionStatus: 'free',
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));

    this.logger.log(
      `User ${userId} subscription canceled, downgraded to free tier`,
    );
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }

  /**
   * Get Stripe instance (for advanced use cases)
   */
  getStripeInstance(): Stripe {
    return this.stripe;
  }
}
