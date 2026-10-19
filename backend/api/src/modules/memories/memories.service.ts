import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  type SQL,
} from 'drizzle-orm';
import { DATABASE_CLIENT } from '../../infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../../infrastructure/database/database.js';
import {
  memories,
  memoryTags,
  stories,
  type Memory,
  type NewMemory,
} from '../../infrastructure/database/schema.js';
import type {
  CreateMemoryDto,
  ListMemoriesDto,
  UpdateMemoryDto,
} from './dto/memory.dto.js';

export type MemoryRecord = Memory & { tags: string[] };

@Injectable()
export class MemoriesService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly client: DatabaseClient,
  ) {}

  async create(
    ownerId: string,
    storyId: string,
    input: CreateMemoryDto,
  ): Promise<MemoryRecord> {
    await this.assertStory(ownerId, storyId);
    this.assertDate(input.eventDate, input.datePrecision);
    return this.client.database.transaction(async (tx) => {
      const [memory] = await tx
        .insert(memories)
        .values({
          ownerId,
          storyId,
          title: this.required(input.title),
          description: this.required(input.description),
          category: input.category ?? 'other',
          eventDate: input.eventDate ?? null,
          datePrecision:
            input.datePrecision ?? (input.eventDate ? 'exact' : 'unknown'),
          location: this.optional(input.location),
          emotionalSignificance: input.emotionalSignificance ?? null,
        })
        .returning();
      if (!memory) throw new Error('Failed to create memory.');
      const tags = this.tags(input.tags);
      if (tags.length)
        await tx
          .insert(memoryTags)
          .values(tags.map((label) => ({ memoryId: memory.id, label })));
      return { ...memory, tags };
    });
  }

  async list(ownerId: string, storyId: string, query: ListMemoriesDto) {
    await this.assertStory(ownerId, storyId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 24;
    const conditions: SQL[] = [
      eq(memories.ownerId, ownerId),
      eq(memories.storyId, storyId),
    ];
    if (query.category) conditions.push(eq(memories.category, query.category));
    if (query.from) conditions.push(gte(memories.eventDate, query.from));
    if (query.to) conditions.push(lte(memories.eventDate, query.to));
    if (query.search?.trim()) {
      const pattern = `%${query.search.trim()}%`;
      const matchingTagIds = this.client.database
        .select({ memoryId: memoryTags.memoryId })
        .from(memoryTags)
        .where(ilike(memoryTags.label, pattern));
      const search = or(
        ilike(memories.title, pattern),
        ilike(memories.description, pattern),
        ilike(memories.location, pattern),
        inArray(memories.id, matchingTagIds),
      );
      if (search) conditions.push(search);
    }
    const where = and(...conditions);
    const column =
      query.sort === 'createdAt' ? memories.createdAt : memories.eventDate;
    const ordering = query.order === 'asc' ? asc(column) : desc(column);
    const [items, totalRows] = await Promise.all([
      this.client.database
        .select()
        .from(memories)
        .where(where)
        .orderBy(ordering, desc(memories.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.client.database
        .select({ value: count() })
        .from(memories)
        .where(where),
    ]);
    return {
      items: await this.withTags(items),
      total: totalRows[0]?.value ?? 0,
      page,
      pageSize,
    };
  }

  async get(ownerId: string, memoryId: string): Promise<MemoryRecord> {
    const memory = await this.findOwned(ownerId, memoryId);
    return (await this.withTags([memory]))[0]!;
  }

  async update(
    ownerId: string,
    memoryId: string,
    input: UpdateMemoryDto,
  ): Promise<MemoryRecord> {
    await this.findOwned(ownerId, memoryId);
    this.assertDate(input.eventDate, input.datePrecision);
    const changes: Partial<NewMemory> = { updatedAt: new Date() };
    if (input.title !== undefined) changes.title = this.required(input.title);
    if (input.description !== undefined)
      changes.description = this.required(input.description);
    if (input.category !== undefined) changes.category = input.category;
    if (input.eventDate !== undefined)
      changes.eventDate = input.eventDate || null;
    if (input.datePrecision !== undefined)
      changes.datePrecision = input.datePrecision;
    if (input.datePrecision === 'unknown') changes.eventDate = null;
    if (input.location !== undefined)
      changes.location = this.optional(input.location);
    if (input.emotionalSignificance !== undefined)
      changes.emotionalSignificance = input.emotionalSignificance;
    return this.client.database.transaction(async (tx) => {
      const [updated] = await tx
        .update(memories)
        .set(changes)
        .where(and(eq(memories.id, memoryId), eq(memories.ownerId, ownerId)))
        .returning();
      if (!updated) throw new NotFoundException('Memory not found.');
      let tags: string[];
      if (input.tags !== undefined) {
        tags = this.tags(input.tags);
        await tx.delete(memoryTags).where(eq(memoryTags.memoryId, memoryId));
        if (tags.length)
          await tx
            .insert(memoryTags)
            .values(tags.map((label) => ({ memoryId, label })));
      } else {
        tags = (
          await tx
            .select({ label: memoryTags.label })
            .from(memoryTags)
            .where(eq(memoryTags.memoryId, memoryId))
        ).map((tag) => tag.label);
      }
      return { ...updated, tags };
    });
  }

  async delete(ownerId: string, memoryId: string): Promise<void> {
    await this.findOwned(ownerId, memoryId);
    await this.client.database
      .delete(memories)
      .where(and(eq(memories.id, memoryId), eq(memories.ownerId, ownerId)));
  }

  private async assertStory(ownerId: string, storyId: string) {
    const [story] = await this.client.database
      .select({ id: stories.id })
      .from(stories)
      .where(and(eq(stories.id, storyId), eq(stories.ownerId, ownerId)))
      .limit(1);
    if (!story) throw new NotFoundException('Story not found.');
  }
  private async findOwned(ownerId: string, memoryId: string) {
    const [memory] = await this.client.database
      .select()
      .from(memories)
      .where(and(eq(memories.id, memoryId), eq(memories.ownerId, ownerId)))
      .limit(1);
    if (!memory) throw new NotFoundException('Memory not found.');
    return memory;
  }
  private async withTags(rows: Memory[]): Promise<MemoryRecord[]> {
    if (!rows.length) return [];
    const tagRows = await this.client.database
      .select()
      .from(memoryTags)
      .where(
        inArray(
          memoryTags.memoryId,
          rows.map((row) => row.id),
        ),
      );
    return rows.map((row) => ({
      ...row,
      tags: tagRows
        .filter((tag) => tag.memoryId === row.id)
        .map((tag) => tag.label),
    }));
  }
  private assertDate(date: string | undefined, precision: string | undefined) {
    if (precision && precision !== 'unknown' && !date)
      throw new BadRequestException(
        'A date is required for the selected precision.',
      );
    if (precision === 'unknown' && date)
      throw new BadRequestException(
        'Unknown dates cannot include an event date.',
      );
  }
  private required(value: string) {
    const text = value.trim();
    if (!text) throw new BadRequestException('Required text cannot be blank.');
    return text;
  }
  private optional(value?: string) {
    return value?.trim() || null;
  }
  private tags(values?: string[]) {
    return [
      ...new Set(
        (values ?? [])
          .map((tag) => tag.trim().toLocaleLowerCase())
          .filter(Boolean),
      ),
    ].slice(0, 20);
  }
}
