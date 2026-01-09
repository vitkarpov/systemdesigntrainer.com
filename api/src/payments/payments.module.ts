import { Module } from '@nestjs/common';
import { PaymentsController } from './controllers/payments.controller';
import { StripeService } from './services/stripe.service';
import { DatabaseModule } from '../../db/db.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PaymentsController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentsModule {}
