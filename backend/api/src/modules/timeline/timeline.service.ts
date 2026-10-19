import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { DATABASE_CLIENT } from '../../infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../../infrastructure/database/database.js';
import {
  memories,
  stories,
  timelineEventMemories,
  timelineEvents,
  type NewTimelineEvent,
  type TimelineEvent,
} from '../../infrastructure/database/schema.js';
import type {
  CreateTimelineEventDto,
  ListTimelineEventsDto,
  UpdateTimelineEventDto,
} from './dto/timeline.dto.js';

export type TimelineRecord = TimelineEvent & { memoryIds: string[] };
@Injectable()
export class TimelineService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly client: DatabaseClient,
  ) {}
  async create(
    ownerId: string,
    storyId: string,
    input: CreateTimelineEventDto,
  ): Promise<TimelineRecord> {
    await this.assertStory(ownerId, storyId);
    this.assertDate(input.eventDate, input.datePrecision);
    await this.assertMemories(ownerId, storyId, input.memoryIds ?? []);
    return this.client.database.transaction(async (tx) => {
      const [event] = await tx
        .insert(timelineEvents)
        .values({
          ownerId,
          storyId,
          title: this.required(input.title),
          description: this.optional(input.description),
          eventDate: input.eventDate ?? null,
          datePrecision:
            input.datePrecision ?? (input.eventDate ? 'exact' : 'unknown'),
          location: this.optional(input.location),
          category: input.category ?? 'other',
          lifeStage: this.optional(input.lifeStage),
        })
        .returning();
      if (!event) throw new Error('Failed to create timeline event.');
      const memoryIds = [...new Set(input.memoryIds ?? [])];
      if (memoryIds.length)
        await tx.insert(timelineEventMemories).values(
          memoryIds.map((memoryId) => ({
            timelineEventId: event.id,
            memoryId,
          })),
        );
      return { ...event, memoryIds };
    });
  }
  async list(ownerId: string, storyId: string, query: ListTimelineEventsDto) {
    await this.assertStory(ownerId, storyId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 100;
    const where = and(
      eq(timelineEvents.ownerId, ownerId),
      eq(timelineEvents.storyId, storyId),
    );
    const [items, totals] = await Promise.all([
      this.client.database
        .select()
        .from(timelineEvents)
        .where(where)
        .orderBy(asc(timelineEvents.eventDate), asc(timelineEvents.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.client.database
        .select({ value: count() })
        .from(timelineEvents)
        .where(where),
    ]);
    return {
      items: await this.withLinks(items),
      total: totals[0]?.value ?? 0,
      page,
      pageSize,
    };
  }
  async get(ownerId: string, id: string) {
    return (await this.withLinks([await this.findOwned(ownerId, id)]))[0]!;
  }
  async update(
    ownerId: string,
    id: string,
    input: UpdateTimelineEventDto,
  ): Promise<TimelineRecord> {
    const current = await this.findOwned(ownerId, id);
    this.assertDate(input.eventDate, input.datePrecision);
    if (input.memoryIds)
      await this.assertMemories(ownerId, current.storyId, input.memoryIds);
    const changes: Partial<NewTimelineEvent> = { updatedAt: new Date() };
    if (input.title !== undefined) changes.title = this.required(input.title);
    if (input.description !== undefined)
      changes.description = this.optional(input.description);
    if (input.eventDate !== undefined)
      changes.eventDate = input.eventDate || null;
    if (input.datePrecision !== undefined)
      changes.datePrecision = input.datePrecision;
    if (input.datePrecision === 'unknown') changes.eventDate = null;
    if (input.location !== undefined)
      changes.location = this.optional(input.location);
    if (input.category !== undefined) changes.category = input.category;
    if (input.lifeStage !== undefined)
      changes.lifeStage = this.optional(input.lifeStage);
    return this.client.database.transaction(async (tx) => {
      const [updated] = await tx
        .update(timelineEvents)
        .set(changes)
        .where(
          and(eq(timelineEvents.id, id), eq(timelineEvents.ownerId, ownerId)),
        )
        .returning();
      if (!updated) throw new NotFoundException('Timeline event not found.');
      if (input.memoryIds !== undefined) {
        await tx
          .delete(timelineEventMemories)
          .where(eq(timelineEventMemories.timelineEventId, id));
        const ids = [...new Set(input.memoryIds)];
        if (ids.length)
          await tx
            .insert(timelineEventMemories)
            .values(ids.map((memoryId) => ({ timelineEventId: id, memoryId })));
      }
      const links = await tx
        .select({ memoryId: timelineEventMemories.memoryId })
        .from(timelineEventMemories)
        .where(eq(timelineEventMemories.timelineEventId, id));
      return { ...updated, memoryIds: links.map((link) => link.memoryId) };
    });
  }
  async link(ownerId: string, id: string, memoryId: string) {
    const event = await this.findOwned(ownerId, id);
    await this.assertMemories(ownerId, event.storyId, [memoryId]);
    await this.client.database
      .insert(timelineEventMemories)
      .values({ timelineEventId: id, memoryId })
      .onConflictDoNothing();
    return this.get(ownerId, id);
  }
  async unlink(ownerId: string, id: string, memoryId: string) {
    await this.findOwned(ownerId, id);
    await this.client.database
      .delete(timelineEventMemories)
      .where(
        and(
          eq(timelineEventMemories.timelineEventId, id),
          eq(timelineEventMemories.memoryId, memoryId),
        ),
      );
    return this.get(ownerId, id);
  }
  async delete(ownerId: string, id: string) {
    await this.findOwned(ownerId, id);
    await this.client.database
      .delete(timelineEvents)
      .where(
        and(eq(timelineEvents.id, id), eq(timelineEvents.ownerId, ownerId)),
      );
  }
  private async assertStory(ownerId: string, storyId: string) {
    const [row] = await this.client.database
      .select({ id: stories.id })
      .from(stories)
      .where(and(eq(stories.id, storyId), eq(stories.ownerId, ownerId)))
      .limit(1);
    if (!row) throw new NotFoundException('Story not found.');
  }
  private async assertMemories(
    ownerId: string,
    storyId: string,
    ids: string[],
  ) {
    if (!ids.length) return;
    const rows = await this.client.database
      .select({ id: memories.id })
      .from(memories)
      .where(
        and(
          eq(memories.ownerId, ownerId),
          eq(memories.storyId, storyId),
          inArray(memories.id, [...new Set(ids)]),
        ),
      );
    if (rows.length !== new Set(ids).size)
      throw new BadRequestException('One or more linked memories are invalid.');
  }
  private async findOwned(ownerId: string, id: string) {
    const [row] = await this.client.database
      .select()
      .from(timelineEvents)
      .where(
        and(eq(timelineEvents.id, id), eq(timelineEvents.ownerId, ownerId)),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Timeline event not found.');
    return row;
  }
  private async withLinks(rows: TimelineEvent[]): Promise<TimelineRecord[]> {
    if (!rows.length) return [];
    const links = await this.client.database
      .select()
      .from(timelineEventMemories)
      .where(
        inArray(
          timelineEventMemories.timelineEventId,
          rows.map((row) => row.id),
        ),
      );
    return rows.map((row) => ({
      ...row,
      memoryIds: links
        .filter((link) => link.timelineEventId === row.id)
        .map((link) => link.memoryId),
    }));
  }
  private assertDate(date?: string, precision?: string) {
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
}
