import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PriceOption {
  THREE_INTERVIEWS = 'price_1SjLXc6w90vVabvpnGzBwrTP',
  FIVE_INTERVIEWS = 'price_1SjLap6w90vVabvpL9NSujHS',
  UNLIMITED = 'price_1SjLZu6w90vVabvpHjJjaaRO',
}

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Stripe Price ID for the product',
    enum: PriceOption,
    example: PriceOption.THREE_INTERVIEWS,
  })
  @IsEnum(PriceOption)
  priceId: string;

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
