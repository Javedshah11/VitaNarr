import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('true')
  .transform((value) => value === 'true');

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  API_HOST: z.string().min(1).default('localhost'),

  API_PORT: z.coerce.number().int().positive().default(4000),

  WEB_URL: z.url().default('http://localhost:3000'),

  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://vitanarr:replace_me@localhost:5432/vitanarr'),

  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  INTELLIGENCE_URL: z.url().default('http://127.0.0.1:8001'),

  CORS_ORIGINS: z.string().min(1).default('http://localhost:3000'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('debug'),

  ENABLE_API_DOCS: booleanString,

  JWT_ACCESS_SECRET: z.string().min(32),

  JWT_ACCESS_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .max(86_400)
    .default(900),

  REFRESH_TOKEN_TTL_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .max(365)
    .default(30),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
