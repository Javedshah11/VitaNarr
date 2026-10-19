import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { InterviewsController } from './interviews.controller.js';
import { InterviewsService } from './interviews.service.js';
import {
  HttpIntelligenceClient,
  INTELLIGENCE_CLIENT,
} from './intelligence.client.js';

@Module({
  imports: [AuthModule],
  controllers: [InterviewsController],
  providers: [
    InterviewsService,
    HttpIntelligenceClient,
    { provide: INTELLIGENCE_CLIENT, useExisting: HttpIntelligenceClient },
  ],
  exports: [InterviewsService, INTELLIGENCE_CLIENT],
})
export class InterviewsModule {}
