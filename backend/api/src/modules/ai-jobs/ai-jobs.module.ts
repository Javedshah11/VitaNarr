import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { Environment } from '../../config/environment.js';
import { AuthModule } from '../auth/auth.module.js';
import { ExtractionsModule } from '../extractions/extractions.module.js';
import { InterviewsModule } from '../interviews/interviews.module.js';
import { AI_QUEUE } from './ai-jobs.constants.js';
import { AiJobsController } from './ai-jobs.controller.js';
import { AiJobsProcessor } from './ai-jobs.processor.js';
import { AiJobsService } from './ai-jobs.service.js';

function redisConnection(value: string) {
  const url = new URL(value);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    InterviewsModule,
    ExtractionsModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        connection: redisConnection(config.get('REDIS_URL', { infer: true })),
      }),
    }),
    BullModule.registerQueue({ name: AI_QUEUE }),
  ],
  controllers: [AiJobsController],
  providers: [AiJobsService, AiJobsProcessor],
  exports: [AiJobsService],
})
export class AiJobsModule {}
