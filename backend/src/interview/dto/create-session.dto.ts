import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ description: 'Interview case ID', example: 1 })
  caseId: number;

  @ApiPropertyOptional({
    description: 'Company interview style',
    enum: ['faang', 'startup', 'generic'],
    default: 'generic',
    required: false,
  })
  companyStyle?: string;

  @ApiPropertyOptional({
    description: 'Interview level',
    enum: ['mid', 'senior', 'staff'],
    default: 'mid',
    required: false,
  })
  level?: string;
}
