import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Product tier enum for pricing options
 * This abstracts away Stripe price IDs from the frontend
 */
export enum ProductTier {
  THREE_INTERVIEWS = 'THREE_INTERVIEWS',
  FIVE_INTERVIEWS = 'FIVE_INTERVIEWS',
  UNLIMITED = 'UNLIMITED',
}

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Product tier to purchase',
    enum: ProductTier,
    example: ProductTier.THREE_INTERVIEWS,
  })
  @IsEnum(ProductTier)
  productTier: ProductTier;

  @ApiProperty({
    description: 'URL to redirect to after successful payment',
    example: 'http://localhost:5173/payment-success',
  })
  @IsString()
  successUrl: string;

  @ApiProperty({
    description: 'URL to redirect to if payment is canceled',
    example: 'http://localhost:5173/pricing',
  })
  @IsString()
  cancelUrl: string;
}

export class CheckoutSessionResponseDto {
  @ApiProperty({
    description: 'Stripe Checkout Session ID',
    example: 'cs_test_a1b2c3d4',
  })
  sessionId: string;

  @ApiProperty({
    description: 'URL to redirect user to Stripe Checkout',
    example: 'https://checkout.stripe.com/pay/cs_test_a1b2c3d4',
  })
  url: string;
}
