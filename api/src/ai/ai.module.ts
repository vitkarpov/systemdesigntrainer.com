import { Module } from '@nestjs/common';
import { AiService } from './services/ai.service';
import { PromptService } from './services/prompt.service';

/**
 * AiModule provides AI-related services for the application.
 *
 * This module has no dependencies on other domain modules, making it highly reusable.
 * Callers are responsible for providing the necessary data (like interview case details)
 * to the PromptService.
 */
@Module({
  imports: [],
  providers: [AiService, PromptService],
  exports: [AiService, PromptService],
})
export class AiModule {}
