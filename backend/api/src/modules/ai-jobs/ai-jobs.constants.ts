export const AI_QUEUE = 'vitanarr-ai';
export const AI_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1_000 },
  removeOnComplete: { age: 86_400, count: 1_000 },
  removeOnFail: { age: 604_800, count: 5_000 },
};

export type AiJobPayload = { jobId: string };
