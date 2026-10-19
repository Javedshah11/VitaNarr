import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MediaModule } from '../media/media.module.js';
import { MemoriesController } from './memories.controller.js';
import { MemoriesService } from './memories.service.js';
@Module({
  imports: [AuthModule, MediaModule],
  controllers: [MemoriesController],
  providers: [MemoriesService],
  exports: [MemoriesService],
})
export class MemoriesModule {}
