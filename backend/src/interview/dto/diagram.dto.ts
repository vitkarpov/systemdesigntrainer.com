import { ApiProperty } from '@nestjs/swagger';

// Request DTO for saving diagram
export class SaveDiagramDto {
  @ApiProperty({
    description: 'Array of ReactFlow nodes',
    type: 'array',
    items: { type: 'object' },
  })
  nodes: any[];

  @ApiProperty({
    description: 'Array of ReactFlow edges',
    type: 'array',
    items: { type: 'object' },
  })
  edges: any[];
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
