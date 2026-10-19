import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';

import { DATABASE_CLIENT } from '../../infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../../infrastructure/database/database.js';
import {
  interviewAnswers,
  interviewQuestions,
  interviewSessions,
  interviewTopicCoverage,
  memories,
  stories,
  type InterviewAnswer,
  type InterviewQuestion,
  type InterviewSession,
} from '../../infrastructure/database/schema.js';
import {
  INTERVIEW_TOPIC_CATEGORIES,
  type ListInterviewsDto,
  type RecordInterviewAnswerDto,
  type StartInterviewDto,
  type UpdateInterviewTopicDto,
} from './dto/interview.dto.js';
import {
  INITIAL_INTERVIEW_QUESTION,
  type InterviewStatus,
} from './interview.constants.js';
import {
  INTELLIGENCE_CLIENT,
  type IntelligenceClient,
} from './intelligence.client.js';

export interface InterviewConversation extends InterviewSession {
  questions: Array<InterviewQuestion & { answer: InterviewAnswer | null }>;
}

@Injectable()
export class InterviewsService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly client: DatabaseClient,
    @Inject(INTELLIGENCE_CLIENT)
    private readonly intelligence: IntelligenceClient,
  ) {}

  async start(
    ownerId: string,
    storyId: string,
    input: StartInterviewDto,
  ): Promise<InterviewConversation> {
    await this.assertStory(ownerId, storyId);

    const sessionId = await this.client.database.transaction(async (tx) => {
      const [session] = await tx
        .insert(interviewSessions)
        .values({
          ownerId,
          storyId,
          focusArea: this.optionalText(input.focusArea),
          language: this.requiredText(input.language ?? 'English'),
        })
        .returning({ id: interviewSessions.id });

      if (!session) throw new Error('Failed to start interview.');

      await tx.insert(interviewQuestions).values({
        sessionId: session.id,
        ownerId,
        sequence: 1,
        prompt: INITIAL_INTERVIEW_QUESTION,
        category: 'childhood',
        source: 'bootstrap',
      });
      await tx.insert(interviewTopicCoverage).values({
        sessionId: session.id,
        ownerId,
        category: 'childhood',
        status: 'exploring',
        questionsAsked: 1,
        lastAskedAt: new Date(),
      });

      return session.id;
    });

    return this.get(ownerId, sessionId);
  }

  async list(ownerId: string, storyId: string, query: ListInterviewsDto) {
    await this.assertStory(ownerId, storyId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = and(
      eq(interviewSessions.ownerId, ownerId),
      eq(interviewSessions.storyId, storyId),
    );
    const [items, totals] = await Promise.all([
      this.client.database
        .select()
        .from(interviewSessions)
        .where(where)
        .orderBy(desc(interviewSessions.updatedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.client.database
        .select({ value: count() })
        .from(interviewSessions)
        .where(where),
    ]);
    return { items, total: totals[0]?.value ?? 0, page, pageSize };
  }

  async get(
    ownerId: string,
    sessionId: string,
  ): Promise<InterviewConversation> {
    const session = await this.findOwned(ownerId, sessionId);
    const questions = await this.client.database
      .select()
      .from(interviewQuestions)
      .where(
        and(
          eq(interviewQuestions.sessionId, sessionId),
          eq(interviewQuestions.ownerId, ownerId),
        ),
      )
      .orderBy(interviewQuestions.sequence);
    const answers = questions.length
      ? await this.client.database
          .select()
          .from(interviewAnswers)
          .where(
            and(
              eq(interviewAnswers.sessionId, sessionId),
              eq(interviewAnswers.ownerId, ownerId),
              inArray(
                interviewAnswers.questionId,
                questions.map((question) => question.id),
              ),
            ),
          )
      : [];

    return {
      ...session,
      questions: questions.map((question) => ({
        ...question,
        answer:
          answers.find((answer) => answer.questionId === question.id) ?? null,
      })),
    };
  }

  async recordAnswer(
    ownerId: string,
    sessionId: string,
    input: RecordInterviewAnswerDto,
  ): Promise<InterviewConversation> {
    const session = await this.findOwned(ownerId, sessionId);
    if (session.status !== 'active') {
      throw new BadRequestException(
        'Answers can only be recorded while an interview is active.',
      );
    }

    const [question] = await this.client.database
      .select({ id: interviewQuestions.id, category: interviewQuestions.category })
      .from(interviewQuestions)
      .where(
        and(
          eq(interviewQuestions.id, input.questionId),
          eq(interviewQuestions.sessionId, sessionId),
          eq(interviewQuestions.ownerId, ownerId),
        ),
      )
      .limit(1);
    if (!question) throw new NotFoundException('Interview question not found.');

    const [existing] = await this.client.database
      .select({ id: interviewAnswers.id })
      .from(interviewAnswers)
      .where(eq(interviewAnswers.questionId, input.questionId))
      .limit(1);
    if (existing) {
      throw new ConflictException(
        'This question already has an original response.',
      );
    }

    const skipped = input.skipped ?? false;
    const content = skipped ? null : this.requiredText(input.content ?? '');
    await this.client.database.transaction(async (tx) => {
      await tx.insert(interviewAnswers).values({
        ownerId,
        sessionId,
        questionId: input.questionId,
        skipped,
        content,
      });
      await tx
        .insert(interviewTopicCoverage)
        .values({
          ownerId,
          sessionId,
          category: question.category,
          status: skipped ? 'skipped' : 'exploring',
          answersReceived: skipped ? 0 : 1,
        })
        .onConflictDoUpdate({
          target: [
            interviewTopicCoverage.sessionId,
            interviewTopicCoverage.category,
          ],
          set: {
            status: skipped
              ? 'skipped'
              : sql`case when ${interviewTopicCoverage.answersReceived} + 1 >= 2 then 'covered'::interview_topic_status else 'exploring'::interview_topic_status end`,
            answersReceived: skipped
              ? interviewTopicCoverage.answersReceived
              : sql`${interviewTopicCoverage.answersReceived} + 1`,
            updatedAt: new Date(),
          },
        });
      await tx
        .update(interviewSessions)
        .set({ updatedAt: new Date() })
        .where(
          and(
            eq(interviewSessions.id, sessionId),
            eq(interviewSessions.ownerId, ownerId),
          ),
        );
    });

    return this.get(ownerId, sessionId);
  }

  async generateNextQuestion(
    ownerId: string,
    sessionId: string,
  ): Promise<InterviewConversation> {
    const conversation = await this.get(ownerId, sessionId);
    if (conversation.status !== 'active') {
      throw new BadRequestException(
        'Questions can only be generated while an interview is active.',
      );
    }
    const last = conversation.questions.at(-1);
    if (!last?.answer) {
      throw new BadRequestException(
        'Answer or skip the current question before requesting another.',
      );
    }

    const memoryRows = await this.client.database
      .select({
        title: memories.title,
        description: memories.description,
        category: memories.category,
        eventDate: memories.eventDate,
        location: memories.location,
      })
      .from(memories)
      .where(
        and(
          eq(memories.ownerId, ownerId),
          eq(memories.storyId, conversation.storyId),
        ),
      )
      .orderBy(desc(memories.updatedAt))
      .limit(20);
    const coverage = await this.client.database
      .select()
      .from(interviewTopicCoverage)
      .where(
        and(
          eq(interviewTopicCoverage.ownerId, ownerId),
          eq(interviewTopicCoverage.sessionId, sessionId),
        ),
      );

    const generated = await this.intelligence.generateQuestion({
      language: conversation.language,
      focus_area: conversation.focusArea,
      conversation: conversation.questions.slice(-50).map((question) => ({
        question: question.prompt,
        answer: question.answer?.content ?? null,
        skipped: question.answer?.skipped ?? false,
      })),
      memories: memoryRows.map((memory) => ({
        title: memory.title,
        description: memory.description,
        category: memory.category,
        event_date: memory.eventDate,
        location: memory.location,
      })),
      topic_coverage: coverage.map((topic) => ({
        category: topic.category,
        status: topic.status,
        questions_asked: topic.questionsAsked,
        answers_received: topic.answersReceived,
        user_boundary: topic.userBoundary,
      })),
    });

    await this.client.database.transaction(async (tx) => {
      const inserted = await tx
        .insert(interviewQuestions)
        .values({
          ownerId,
          sessionId,
          sequence: last.sequence + 1,
          prompt: generated.question,
          category: generated.category,
          source: 'ai',
        })
        .onConflictDoNothing({
          target: [interviewQuestions.sessionId, interviewQuestions.sequence],
        })
        .returning({ id: interviewQuestions.id });
      if (!inserted.length) return;

      const now = new Date();
      await tx
        .insert(interviewTopicCoverage)
        .values({
          ownerId,
          sessionId,
          category: generated.category,
          status: 'exploring',
          questionsAsked: 1,
          lastAskedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            interviewTopicCoverage.sessionId,
            interviewTopicCoverage.category,
          ],
          set: {
            status: 'exploring',
            questionsAsked: sql`${interviewTopicCoverage.questionsAsked} + 1`,
            lastAskedAt: now,
            updatedAt: now,
          },
        });
      await tx
        .update(interviewSessions)
        .set({ updatedAt: now })
        .where(
          and(
            eq(interviewSessions.id, sessionId),
            eq(interviewSessions.ownerId, ownerId),
          ),
        );
    });
    return this.get(ownerId, sessionId);
  }

  async progress(ownerId: string, sessionId: string) {
    await this.findOwned(ownerId, sessionId);
    return this.client.database
      .select()
      .from(interviewTopicCoverage)
      .where(
        and(
          eq(interviewTopicCoverage.ownerId, ownerId),
          eq(interviewTopicCoverage.sessionId, sessionId),
        ),
      )
      .orderBy(interviewTopicCoverage.category);
  }

  async updateTopic(
    ownerId: string,
    sessionId: string,
    category: (typeof INTERVIEW_TOPIC_CATEGORIES)[number],
    input: UpdateInterviewTopicDto,
  ) {
    await this.findOwned(ownerId, sessionId);
    const [topic] = await this.client.database
      .insert(interviewTopicCoverage)
      .values({
        ownerId,
        sessionId,
        category,
        status: input.status,
        userBoundary: input.status === 'skipped',
      })
      .onConflictDoUpdate({
        target: [
          interviewTopicCoverage.sessionId,
          interviewTopicCoverage.category,
        ],
        set: {
          status: input.status,
          userBoundary: input.status === 'skipped',
          updatedAt: new Date(),
        },
      })
      .returning();
    return topic;
  }

  pause(ownerId: string, sessionId: string): Promise<InterviewSession> {
    return this.transition(ownerId, sessionId, 'paused');
  }

  resume(ownerId: string, sessionId: string): Promise<InterviewSession> {
    return this.transition(ownerId, sessionId, 'active');
  }

  complete(ownerId: string, sessionId: string): Promise<InterviewSession> {
    return this.transition(ownerId, sessionId, 'completed');
  }

  private async transition(
    ownerId: string,
    sessionId: string,
    next: InterviewStatus,
  ): Promise<InterviewSession> {
    const current = await this.findOwned(ownerId, sessionId);
    const allowed: Record<InterviewStatus, InterviewStatus[]> = {
      active: ['paused', 'completed'],
      paused: ['active', 'completed'],
      completed: [],
    };
    if (!allowed[current.status].includes(next)) {
      throw new BadRequestException(
        `An interview cannot move from ${current.status} to ${next}.`,
      );
    }

    const now = new Date();
    const [updated] = await this.client.database
      .update(interviewSessions)
      .set({
        status: next,
        pausedAt: next === 'paused' ? now : null,
        completedAt: next === 'completed' ? now : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(interviewSessions.id, sessionId),
          eq(interviewSessions.ownerId, ownerId),
        ),
      )
      .returning();
    if (!updated) throw new NotFoundException('Interview session not found.');
    return updated;
  }

  private async assertStory(ownerId: string, storyId: string): Promise<void> {
    const [story] = await this.client.database
      .select({ id: stories.id })
      .from(stories)
      .where(and(eq(stories.id, storyId), eq(stories.ownerId, ownerId)))
      .limit(1);
    if (!story) throw new NotFoundException('Story not found.');
  }

  private async findOwned(
    ownerId: string,
    sessionId: string,
  ): Promise<InterviewSession> {
    const [session] = await this.client.database
      .select()
      .from(interviewSessions)
      .where(
        and(
          eq(interviewSessions.id, sessionId),
          eq(interviewSessions.ownerId, ownerId),
        ),
      )
      .limit(1);
    if (!session) throw new NotFoundException('Interview session not found.');
    return session;
  }

  private requiredText(value: string): string {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException('Text cannot be blank.');
    return normalized;
  }

  private optionalText(value?: string): string | null {
    return value?.trim() || null;
  }
}
