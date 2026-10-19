import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { InterviewsModule } from '../interviews/interviews.module.js';
import { ExtractionsController } from './extractions.controller.js';
import { ExtractionsService } from './extractions.service.js';

@Module({
  imports: [AuthModule, InterviewsModule],
  controllers: [ExtractionsController],
  providers: [ExtractionsService],
  exports: [ExtractionsService],
})
export class ExtractionsModule {}
