import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { AuthenticatedUser } from '../auth/authenticated-user.decorator.js';
import type { SafeUser } from '../users/user.types.js';
import { MediaService } from './media.service.js';
@UseGuards(AccessTokenGuard)
@Controller()
export class MediaController {
  constructor(private readonly service: MediaService) {}
  @Post('memories/:memoryId/media')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @AuthenticatedUser() user: SafeUser,
    @Param('memoryId', new ParseUUIDPipe()) memoryId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.upload(user.id, memoryId, file);
  }
  @Get('memories/:memoryId/media') list(
    @AuthenticatedUser() user: SafeUser,
    @Param('memoryId', new ParseUUIDPipe()) memoryId: string,
  ) {
    return this.service.list(user.id, memoryId);
  }
  @Get('media/:assetId/content')
  @Header('Cache-Control', 'private, max-age=300')
  async content(
    @AuthenticatedUser() user: SafeUser,
    @Param('assetId', new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { asset, buffer } = await this.service.read(user.id, id);
    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${asset.originalName.replaceAll('"', '')}"`,
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(buffer);
  }
  @Delete('media/:assetId') @HttpCode(HttpStatus.NO_CONTENT) async delete(
    @AuthenticatedUser() user: SafeUser,
    @Param('assetId', new ParseUUIDPipe()) id: string,
  ) {
    await this.service.delete(user.id, id);
  }
}
