import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DATABASE_CLIENT } from '../../infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../../infrastructure/database/database.js';
import {
  extractionCandidates,
  interviewAnswers,
  interviewSessions,
  memories,
  memorySourceReferences,
  timelineEventMemories,
  timelineEvents,
  type ExtractionCandidate,
} from '../../infrastructure/database/schema.js';
import {
  INTELLIGENCE_CLIENT,
  type IntelligenceClient,
} from '../interviews/intelligence.client.js';
import type { ApproveExtractionDto, UpdateExtractionDto } from './dto/extraction.dto.js';

@Injectable()
export class ExtractionsService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly client: DatabaseClient,
    @Inject(INTELLIGENCE_CLIENT) private readonly intelligence: IntelligenceClient,
  ) {}

  async request(ownerId: string, sessionId: string) {
    const session = await this.findSession(ownerId, sessionId);
    const answers = await this.client.database
      .select({ id: interviewAnswers.id, content: interviewAnswers.content })
      .from(interviewAnswers)
      .where(
        and(
          eq(interviewAnswers.ownerId, ownerId),
          eq(interviewAnswers.sessionId, sessionId),
          eq(interviewAnswers.skipped, false),
        ),
      );
    const originals = answers.flatMap((answer) =>
      answer.content ? [{ id: answer.id, content: answer.content }] : [],
    );
    if (!originals.length) {
      throw new BadRequestException('This interview has no answers to extract.');
    }

    const result = await this.intelligence.extractMemories({
      language: session.language,
      answers: originals,
    });
    const sources = new Map(originals.map((answer) => [answer.id, answer.content]));
    const values = result.candidates.flatMap((candidate) => {
      const source = sources.get(candidate.source_answer_id);
      if (!source || !source.toLocaleLowerCase().includes(candidate.evidence_quote.toLocaleLowerCase())) {
        return [];
      }
      this.assertDate(candidate.event_date, candidate.date_precision);
      return [{
        ownerId,
        sessionId,
        storyId: session.storyId,
        sourceAnswerId: candidate.source_answer_id,
        fingerprint: this.fingerprint(candidate.source_answer_id, candidate.title, candidate.description),
        title: candidate.title,
        description: candidate.description,
        category: candidate.category,
        eventDate: candidate.event_date,
        datePrecision: candidate.date_precision,
        location: candidate.location,
        evidenceQuote: candidate.evidence_quote,
      }];
    });
    if (values.length) {
      await this.client.database
        .insert(extractionCandidates)
        .values(values)
        .onConflictDoNothing({
          target: [extractionCandidates.sessionId, extractionCandidates.fingerprint],
        });
    }
    return this.list(ownerId, sessionId);
  }

  async list(ownerId: string, sessionId: string) {
    await this.findSession(ownerId, sessionId);
    return this.client.database
      .select()
      .from(extractionCandidates)
      .where(
        and(
          eq(extractionCandidates.ownerId, ownerId),
          eq(extractionCandidates.sessionId, sessionId),
        ),
      )
      .orderBy(extractionCandidates.createdAt);
  }

  async update(ownerId: string, extractionId: string, input: UpdateExtractionDto) {
    const current = await this.findCandidate(ownerId, extractionId);
    if (current.status !== 'pending') {
      throw new ConflictException('Only pending suggestions can be edited.');
    }
    const eventDate = input.eventDate === undefined ? current.eventDate : input.eventDate;
    const precision = input.datePrecision ?? current.datePrecision;
    this.assertDate(eventDate, precision);
    const [updated] = await this.client.database
      .update(extractionCandidates)
      .set({
        title: input.title?.trim() ?? current.title,
        description: input.description?.trim() ?? current.description,
        category: input.category ?? current.category,
        eventDate,
        datePrecision: precision,
        location: input.location === undefined ? current.location : input.location?.trim() || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(extractionCandidates.id, extractionId),
          eq(extractionCandidates.ownerId, ownerId),
          eq(extractionCandidates.status, 'pending'),
        ),
      )
      .returning();
    if (!updated) throw new ConflictException('Suggestion is no longer pending.');
    return updated;
  }

  async reject(ownerId: string, extractionId: string) {
    const current = await this.findCandidate(ownerId, extractionId);
    if (current.status === 'rejected') return current;
    if (current.status === 'approved') {
      throw new ConflictException('Approved suggestions cannot be rejected.');
    }
    const [rejected] = await this.client.database
      .update(extractionCandidates)
      .set({ status: 'rejected', reviewedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(extractionCandidates.id, extractionId),
          eq(extractionCandidates.ownerId, ownerId),
          eq(extractionCandidates.status, 'pending'),
        ),
      )
      .returning();
    return rejected ?? this.findCandidate(ownerId, extractionId);
  }

  async approve(ownerId: string, extractionId: string, input: ApproveExtractionDto) {
    return this.client.database.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(extractionCandidates)
        .where(
          and(
            eq(extractionCandidates.id, extractionId),
            eq(extractionCandidates.ownerId, ownerId),
          ),
        )
        .for('update')
        .limit(1);
      if (!current) throw new NotFoundException('Extraction suggestion not found.');
      if (current.status === 'approved') return current;
      if (current.status === 'rejected') {
        throw new ConflictException('Rejected suggestions cannot be approved.');
      }
      const eventDate = input.eventDate === undefined ? current.eventDate : input.eventDate;
      const precision = input.datePrecision ?? current.datePrecision;
      this.assertDate(eventDate, precision);
      const [memory] = await tx
        .insert(memories)
        .values({
          ownerId,
          storyId: current.storyId,
          title: input.title?.trim() ?? current.title,
          description: input.description?.trim() ?? current.description,
          category: input.category ?? current.category,
          eventDate,
          datePrecision: precision,
          location: input.location === undefined ? current.location : input.location?.trim() || null,
        })
        .returning();
      if (!memory) throw new Error('Failed to create approved memory.');
      await tx.insert(memorySourceReferences).values({
        memoryId: memory.id,
        answerId: current.sourceAnswerId,
        extractionId: current.id,
      });

      let timelineEventId: string | null = null;
      if (input.createTimelineEvent) {
        const [event] = await tx
          .insert(timelineEvents)
          .values({
            ownerId,
            storyId: current.storyId,
            title: memory.title,
            description: memory.description,
            category: memory.category,
            eventDate: memory.eventDate,
            datePrecision: memory.datePrecision,
            location: memory.location,
          })
          .returning({ id: timelineEvents.id });
        if (!event) throw new Error('Failed to create timeline event.');
        timelineEventId = event.id;
        await tx.insert(timelineEventMemories).values({
          timelineEventId: event.id,
          memoryId: memory.id,
        });
      }

      const [approved] = await tx
        .update(extractionCandidates)
        .set({
          title: memory.title,
          description: memory.description,
          category: memory.category,
          eventDate: memory.eventDate,
          datePrecision: memory.datePrecision,
          location: memory.location,
          status: 'approved',
          approvedMemoryId: memory.id,
          approvedTimelineEventId: timelineEventId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(extractionCandidates.id, extractionId))
        .returning();
      return approved!;
    });
  }

  private async findSession(ownerId: string, sessionId: string) {
    const [session] = await this.client.database
      .select()
      .from(interviewSessions)
      .where(
        and(eq(interviewSessions.id, sessionId), eq(interviewSessions.ownerId, ownerId)),
      )
      .limit(1);
    if (!session) throw new NotFoundException('Interview session not found.');
    return session;
  }

  private async findCandidate(ownerId: string, extractionId: string): Promise<ExtractionCandidate> {
    const [candidate] = await this.client.database
      .select()
      .from(extractionCandidates)
      .where(
        and(
          eq(extractionCandidates.id, extractionId),
          eq(extractionCandidates.ownerId, ownerId),
        ),
      )
      .limit(1);
    if (!candidate) throw new NotFoundException('Extraction suggestion not found.');
    return candidate;
  }

  private fingerprint(answerId: string, title: string, description: string) {
    return createHash('sha256')
      .update(`${answerId}\0${title.trim().toLocaleLowerCase()}\0${description.trim().toLocaleLowerCase()}`)
      .digest('hex');
  }

  private assertDate(date: string | null | undefined, precision: string) {
    if (precision === 'unknown' && date) {
      throw new BadRequestException('Unknown dates cannot include an event date.');
    }
    if (precision !== 'unknown' && !date) {
      throw new BadRequestException('A date is required for the selected precision.');
    }
  }
}
