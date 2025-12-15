import { Module } from '@nestjs/common';
import { AiService } from './services/ai.service';
import { PromptService } from './services/prompt.service';
import { DatabaseModule } from '../db/db.module';

@Module({
  imports: [DatabaseModule],
  providers: [AiService, PromptService],
  exports: [AiService, PromptService],
})
export class AiModule {}
