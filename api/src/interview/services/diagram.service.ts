import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../db/db.module';
import type { db as DbType } from '../../db/db';
import { eq, desc } from 'drizzle-orm';
import { diagramSnapshots, diagramElements } from '../../db/schema';
import { InterviewPhase } from '../types/session.types';

export interface SaveDiagramDto {
  sessionId: number;
  nodes: any[];
  edges: any[];
  phase: InterviewPhase;
  secondsElapsed: number;
}

export interface DiagramData {
  nodes: any[];
  edges: any[];
  snapshotId: number;
  snapshotAt: Date;
  phase: string;
}

@Injectable()
export class DiagramService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
  ) {}

  /**
   * Save a new diagram snapshot
   * Creates a snapshot record and stores nodes/edges as JSON
   */
  async saveDiagramSnapshot(
    dto: SaveDiagramDto,
  ): Promise<{ snapshotId: number; savedAt: Date }> {
    // 1. Insert into diagram_snapshots
    const [snapshot] = await this.db
      .insert(diagramSnapshots)
      .values({
        sessionId: dto.sessionId,
        snapshotAt: new Date(),
        secondsElapsed: dto.secondsElapsed,
        phase: dto.phase,
      })
      .returning();

    // 2. Store diagram data as JSON in diagram_elements
    await this.db.insert(diagramElements).values({
      snapshotId: snapshot.id,
      elementType: 'diagram_data',
      label: JSON.stringify({ nodes: dto.nodes, edges: dto.edges }),
    });

    return { snapshotId: snapshot.id, savedAt: snapshot.snapshotAt };
  }

  /**
   * Get the latest diagram for a session
   * Returns null if no diagram exists
   */
  async getLatestDiagram(sessionId: number): Promise<DiagramData | null> {
    // Get the latest snapshot for this session
    const latestSnapshot = await this.db.query.diagramSnapshots.findFirst({
      where: eq(diagramSnapshots.sessionId, sessionId),
      orderBy: [desc(diagramSnapshots.snapshotAt)],
    });

    if (!latestSnapshot) return null;

    // Get the diagram element for this snapshot
    const diagramElement = await this.db.query.diagramElements.findFirst({
      where: eq(diagramElements.snapshotId, latestSnapshot.id),
    });

    if (!diagramElement || !diagramElement.label) return null;

    const diagramData = JSON.parse(diagramElement.label);

    return {
      nodes: diagramData.nodes || [],
      edges: diagramData.edges || [],
      snapshotId: latestSnapshot.id,
      snapshotAt: latestSnapshot.snapshotAt,
      phase: latestSnapshot.phase,
    };
  }
}
