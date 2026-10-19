import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import type { Environment } from '../../config/environment.js';

const categorySchema = z.enum([
  'childhood',
  'family',
  'education',
  'friendship',
  'career',
  'travel',
  'celebration',
  'challenge',
  'achievement',
  'other',
]);

const generatedQuestionSchema = z.object({
  question: z.string().trim().min(10).max(500).refine((value) => value.endsWith('?')),
  category: categorySchema,
  strategy: z.enum(['follow_up', 'explore_topic', 'fallback']),
  target_topic: categorySchema,
});

const extractionResponseSchema = z.object({
  candidates: z.array(
    z.object({
      source_answer_id: z.uuid(),
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().min(1).max(20_000),
      category: categorySchema,
      event_date: z.iso.date().nullable(),
      date_precision: z.enum(['exact', 'month', 'year', 'approximate', 'unknown']),
      location: z.string().trim().max(255).nullable(),
      evidence_quote: z.string().trim().min(1).max(2000),
    }),
  ).max(25),
});

export interface InterviewGenerationContext {
  language: string;
  focus_area: string | null;
  conversation: Array<{
    question: string;
    answer: string | null;
    skipped: boolean;
  }>;
  memories: Array<{
    title: string;
    description: string;
    category: z.infer<typeof categorySchema>;
    event_date: string | null;
    location: string | null;
  }>;
  topic_coverage: Array<{
    category: z.infer<typeof categorySchema>;
    status: 'unexplored' | 'exploring' | 'covered' | 'skipped';
    questions_asked: number;
    answers_received: number;
    user_boundary: boolean;
  }>;
}

export type GeneratedInterviewQuestion = z.infer<typeof generatedQuestionSchema>;

export const INTELLIGENCE_CLIENT = Symbol('INTELLIGENCE_CLIENT');

export interface IntelligenceClient {
  generateQuestion(context: InterviewGenerationContext): Promise<GeneratedInterviewQuestion>;
  extractMemories(input: {
    language: string;
    answers: Array<{ id: string; content: string }>;
  }): Promise<z.infer<typeof extractionResponseSchema>>;
}

@Injectable()
export class HttpIntelligenceClient implements IntelligenceClient {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async generateQuestion(
    context: InterviewGenerationContext,
  ): Promise<GeneratedInterviewQuestion> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.get('INTELLIGENCE_TIMEOUT_MS', { infer: true }),
    );
    try {
      const response = await fetch(
        `${this.config.get('INTELLIGENCE_URL', { infer: true })}/internal/interviews/questions`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-vitanarr-internal-token': this.config.get(
              'INTELLIGENCE_INTERNAL_TOKEN',
              { infer: true },
            ),
          },
          body: JSON.stringify(context),
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error(`Intelligence service returned ${response.status}`);
      return generatedQuestionSchema.parse(await response.json());
    } catch {
      throw new ServiceUnavailableException({
        message: 'The next interview question could not be generated. Please retry.',
        retryable: true,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async extractMemories(input: {
    language: string;
    answers: Array<{ id: string; content: string }>;
  }) {
    return this.request('/internal/extractions', input, extractionResponseSchema);
  }

  private async request<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.get('INTELLIGENCE_TIMEOUT_MS', { infer: true }),
    );
    try {
      const response = await fetch(
        `${this.config.get('INTELLIGENCE_URL', { infer: true })}${path}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-vitanarr-internal-token': this.config.get(
              'INTELLIGENCE_INTERNAL_TOKEN',
              { infer: true },
            ),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error(`Intelligence service returned ${response.status}`);
      return schema.parse(await response.json());
    } catch {
      throw new ServiceUnavailableException({
        message: 'AI processing is temporarily unavailable. Please retry.',
        retryable: true,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
