import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { InterviewCasesService } from '../services/interview-cases.service';
import type { InterviewCase } from '../../db/schema/interview-cases.schema';

@Controller('api/cases')
export class CasesController {
  constructor(private casesService: InterviewCasesService) {}

  /**
   * Get all active interview cases
   */
  @Get()
  async getAllCases(): Promise<InterviewCase[]> {
    return this.casesService.getAllCases();
  }

  /**
   * Get a specific case by ID
   */
  @Get(':id')
  async getCaseById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InterviewCase> {
    return this.casesService.getCaseById(id);
  }
}
