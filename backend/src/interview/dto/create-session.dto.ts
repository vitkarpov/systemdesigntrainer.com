import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ description: 'Interview case ID', example: 1 })
  @IsNumber()
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
