import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../db/db.module';
import type { db as DbType } from '../../../db/db';
import { interviewCases } from '../../../db/schema';
import type { InterviewCase } from '../../../db/schema/interview-cases.schema';

@Injectable()
export class InterviewCasesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
  ) {}

  /**
   * Get all active interview cases
   */
  async getAllCases(): Promise<InterviewCase[]> {
    const cases = await this.db
      .select()
      .from(interviewCases)
      .where(eq(interviewCases.isActive, true));

    return cases;
  }

  /**
   * Get a specific case by ID
   */
  async getCaseById(id: number): Promise<InterviewCase> {
    const [caseItem] = await this.db
      .select()
      .from(interviewCases)
      .where(eq(interviewCases.id, id));

    if (!caseItem) {
      throw new NotFoundException(`Case ${id} not found`);
    }

    return caseItem;
  }

  /**
   * Get a case by slug
   */
  async getCaseBySlug(slug: string): Promise<InterviewCase> {
    const [caseItem] = await this.db
      .select()
      .from(interviewCases)
      .where(eq(interviewCases.slug, slug));

    if (!caseItem) {
      throw new NotFoundException(`Case with slug '${slug}' not found`);
    }

    return caseItem;
  }
}
