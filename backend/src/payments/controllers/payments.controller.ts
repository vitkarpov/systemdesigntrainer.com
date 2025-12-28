import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { StripeService } from '../services/stripe.service';
import {
  CreateCheckoutSessionDto,
  CheckoutSessionResponseDto,
} from '../dto/checkout.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { User } from '../../db/schema';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout session' })
  @ApiResponse({
    status: 200,
    description: 'Checkout session created successfully',
    type: CheckoutSessionResponseDto,
  })
  async createCheckoutSession(
    @CurrentUser() user: User,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    this.logger.log(`Creating checkout for user ${user.id}: ${dto.priceId}`);

    const session = await this.stripeService.createCheckoutSession(
      user.id,
      user.email,
      dto.priceId,
      dto.successUrl,
      dto.cancelUrl,
    );

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    this.logger.log('Received Stripe webhook');

    if (!signature) {
      this.logger.error('Missing stripe-signature header');
      throw new Error('Missing stripe-signature header');
    }

    // Get raw body (NestJS provides this via rawBody)
    const rawBody = request.rawBody;
    if (!rawBody) {
      this.logger.error('Missing raw body for webhook verification');
      throw new Error('Missing raw body');
    }

    // Verify webhook signature
    let event;
    try {
      event = this.stripeService.verifyWebhookSignature(rawBody, signature);
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw err;
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.stripeService.handleSuccessfulPayment(event);
          break;

        case 'customer.subscription.deleted':
          await this.stripeService.handleSubscriptionCanceled(event);
          break;

        case 'invoice.payment_succeeded':
          // Handle subscription renewal
          this.logger.log('Subscription renewed successfully');
          break;

        case 'invoice.payment_failed':
          // Handle failed payment
          this.logger.warn('Subscription payment failed');
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      throw error;
    }

    return { received: true };
  }
}
