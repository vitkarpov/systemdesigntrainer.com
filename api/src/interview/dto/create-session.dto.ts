import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsPositive, IsEnum, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ description: 'Interview case ID', example: 1 })
  @IsInt({ message: 'Case ID must be an integer' })
  @IsPositive({ message: 'Case ID must be positive' })
  caseId: number;

  @ApiPropertyOptional({
    description: 'Company interview style',
    enum: ['faang', 'startup', 'generic'],
    default: 'generic',
    required: false,
  })
  @IsOptional()
  @IsEnum(['faang', 'startup', 'generic'])
  companyStyle?: string;

  @ApiPropertyOptional({
    description: 'Interview level',
    enum: ['mid', 'senior', 'staff'],
    default: 'mid',
    required: false,
  })
  @IsOptional()
  @IsEnum(['mid', 'senior', 'staff'])
  level?: string;
}
