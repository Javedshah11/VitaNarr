import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MediaModule } from '../media/media.module.js';
import { StoriesController } from './stories.controller.js';
import { StoriesService } from './stories.service.js';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
