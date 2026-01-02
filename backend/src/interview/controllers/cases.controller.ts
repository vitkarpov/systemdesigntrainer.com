import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InterviewCasesService } from '../services/interview-cases.service';
import { InterviewCaseDto } from '../dto/responses.dto';

@ApiTags('cases')
@Controller('cases')
export class CasesController {
  constructor(private casesService: InterviewCasesService) {}

  /**
   * Get all active interview cases
   */
  @Get()
  @ApiOperation({ summary: 'Get all active interview cases' })
  @ApiResponse({
    status: 200,
    description: 'List of all active interview cases',
    type: [InterviewCaseDto],
  })
  async getAllCases(): Promise<InterviewCaseDto[]> {
    return this.casesService.getAllCases();
  }

  /**
   * Get a specific case by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific interview case by ID' })
  @ApiParam({ name: 'id', description: 'Case ID' })
  @ApiResponse({
    status: 200,
    description: 'Interview case details',
    type: InterviewCaseDto,
  })
  async getCaseById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InterviewCaseDto> {
    return this.casesService.getCaseById(id);
  }
}
