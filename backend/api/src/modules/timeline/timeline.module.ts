import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TimelineController } from './timeline.controller.js';
import { TimelineService } from './timeline.service.js';
@Module({
  imports: [AuthModule],
  controllers: [TimelineController],
  providers: [TimelineService],
})
export class TimelineModule {}
