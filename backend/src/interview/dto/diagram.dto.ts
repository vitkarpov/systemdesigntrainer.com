import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

// Position DTO
export class PositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

// Node data DTO
export class NodeDataDto {
  @IsString()
  @IsNotEmpty()
  label: string;
}

// Node DTO for validation
export class NodeDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;

  @ValidateNested()
  @Type(() => NodeDataDto)
  data: NodeDataDto;
}

// Edge DTO for validation
export class EdgeDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsString()
  @IsNotEmpty()
  target: string;
}

// Request DTO for saving diagram
export class SaveDiagramDto {
  @ApiProperty({
    description: 'Array of ReactFlow nodes',
    type: [NodeDto],
  })
  @IsArray()
  @ArrayMaxSize(1000, { message: 'Diagram cannot have more than 1000 nodes' })
  @ValidateNested({ each: true })
  @Type(() => NodeDto)
  nodes: NodeDto[];

  @ApiProperty({
    description: 'Array of ReactFlow edges',
    type: [EdgeDto],
  })
  @IsArray()
  @ArrayMaxSize(2000, { message: 'Diagram cannot have more than 2000 edges' })
  @ValidateNested({ each: true })
  @Type(() => EdgeDto)
  edges: EdgeDto[];
}

// Individual diagram data structure
export class DiagramDataDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  nodes: any[];

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  edges: any[];

  @ApiProperty()
  snapshotId: number;

  @ApiProperty()
  snapshotAt: Date;

  @ApiProperty()
  phase: string;
}

// Response wrapper for save operation
export class SaveDiagramResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  data: {
    snapshotId: number;
    savedAt: Date;
  };
}

// Response wrapper for get operation
export class GetDiagramResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty({ type: DiagramDataDto, nullable: true })
  data: DiagramDataDto | null;
}
