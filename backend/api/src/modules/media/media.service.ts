import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DATABASE_CLIENT } from '../../infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../../infrastructure/database/database.js';
import {
  mediaAssets,
  memories,
  type MediaAsset,
} from '../../infrastructure/database/schema.js';

const ALLOWED = new Map([
  ['image/jpeg', { extension: '.jpg', kind: 'image' as const }],
  ['image/png', { extension: '.png', kind: 'image' as const }],
  ['image/webp', { extension: '.webp', kind: 'image' as const }],
  ['application/pdf', { extension: '.pdf', kind: 'document' as const }],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    { extension: '.docx', kind: 'document' as const },
  ],
]);

@Injectable()
export class MediaService {
  private readonly storageRoot: string;
  constructor(
    @Inject(DATABASE_CLIENT) private readonly client: DatabaseClient,
    config: ConfigService,
  ) {
    this.storageRoot = resolve(
      config.get<string>('STORAGE_PATH') ?? './storage',
      'private-media',
    );
  }
  async upload(
    ownerId: string,
    memoryId: string,
    file?: Express.Multer.File,
  ): Promise<MediaAsset> {
    if (!file) throw new BadRequestException('Choose a file to upload.');
    const definition = ALLOWED.get(file.mimetype);
    if (!definition || !this.matchesSignature(file.mimetype, file.buffer))
      throw new BadRequestException(
        'Unsupported or invalid file content. Use JPG, PNG, WebP, PDF, or DOCX.',
      );
    const [memory] = await this.client.database
      .select({ id: memories.id, storyId: memories.storyId })
      .from(memories)
      .where(and(eq(memories.id, memoryId), eq(memories.ownerId, ownerId)))
      .limit(1);
    if (!memory) throw new NotFoundException('Memory not found.');
    const storageKey = `${ownerId}/${randomUUID()}${definition.extension}`;
    const path = this.path(storageKey);
    await mkdir(resolve(this.storageRoot, ownerId), { recursive: true });
    try {
      await writeFile(path, file.buffer, { flag: 'wx' });
      const [asset] = await this.client.database
        .insert(mediaAssets)
        .values({
          ownerId,
          storyId: memory.storyId,
          memoryId,
          kind: definition.kind,
          storageKey,
          originalName: this.safeName(file.originalname),
          mimeType: file.mimetype,
          sizeBytes: file.size,
        })
        .returning();
      if (!asset) throw new Error('Failed to store media metadata.');
      return asset;
    } catch (error) {
      await unlink(path).catch(() => undefined);
      throw error;
    }
  }
  async list(ownerId: string, memoryId: string) {
    await this.assertMemory(ownerId, memoryId);
    return this.client.database
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.ownerId, ownerId),
          eq(mediaAssets.memoryId, memoryId),
        ),
      );
  }
  async read(ownerId: string, assetId: string) {
    const asset = await this.findOwned(ownerId, assetId);
    return { asset, buffer: await readFile(this.path(asset.storageKey)) };
  }
  async delete(ownerId: string, assetId: string) {
    const asset = await this.findOwned(ownerId, assetId);
    await this.client.database
      .delete(mediaAssets)
      .where(
        and(eq(mediaAssets.id, assetId), eq(mediaAssets.ownerId, ownerId)),
      );
    await unlink(this.path(asset.storageKey)).catch(() => undefined);
  }
  async keysForStory(ownerId: string, storyId: string): Promise<string[]> {
    const rows = await this.client.database
      .select({ key: mediaAssets.storageKey })
      .from(mediaAssets)
      .where(
        and(eq(mediaAssets.ownerId, ownerId), eq(mediaAssets.storyId, storyId)),
      );
    return rows.map((row) => row.key);
  }
  async keysForMemory(ownerId: string, memoryId: string): Promise<string[]> {
    const rows = await this.client.database
      .select({ key: mediaAssets.storageKey })
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.ownerId, ownerId),
          eq(mediaAssets.memoryId, memoryId),
        ),
      );
    return rows.map((row) => row.key);
  }
  async removeStoredFiles(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map((key) => unlink(this.path(key)).catch(() => undefined)),
    );
  }
  private async assertMemory(ownerId: string, id: string) {
    const [row] = await this.client.database
      .select({ id: memories.id })
      .from(memories)
      .where(and(eq(memories.id, id), eq(memories.ownerId, ownerId)))
      .limit(1);
    if (!row) throw new NotFoundException('Memory not found.');
  }
  private async findOwned(ownerId: string, id: string) {
    const [row] = await this.client.database
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.id, id), eq(mediaAssets.ownerId, ownerId)))
      .limit(1);
    if (!row) throw new NotFoundException('Media asset not found.');
    return row;
  }
  private path(key: string) {
    const path = resolve(this.storageRoot, key);
    const relation = relative(this.storageRoot, path);
    if (relation.startsWith('..') || isAbsolute(relation))
      throw new BadRequestException('Invalid storage key.');
    return path;
  }
  private safeName(name: string) {
    return (
      name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 255) ||
      `upload${extname(name)}`
    );
  }
  private matchesSignature(mime: string, value: Buffer) {
    if (mime === 'image/jpeg')
      return value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff;
    if (mime === 'image/png')
      return value
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mime === 'image/webp')
      return (
        value.subarray(0, 4).toString() === 'RIFF' &&
        value.subarray(8, 12).toString() === 'WEBP'
      );
    if (mime === 'application/pdf')
      return value.subarray(0, 5).toString() === '%PDF-';
    return value[0] === 0x50 && value[1] === 0x4b;
  }
}
