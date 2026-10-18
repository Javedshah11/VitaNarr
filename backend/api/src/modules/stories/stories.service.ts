import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, ilike, or, type SQL } from 'drizzle-orm';

import { DATABASE_CLIENT } from '../../infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../../infrastructure/database/database.js';
import {
  stories,
  type NewStory,
  type Story,
} from '../../infrastructure/database/schema.js';
import type { CreateStoryDto } from './dto/create-story.dto.js';
import type { DeleteStoryDto } from './dto/delete-story.dto.js';
import type { ListStoriesDto } from './dto/list-stories.dto.js';
import type { UpdateStoryDto } from './dto/update-story.dto.js';
import {
  canTransitionStoryStatus,
  type StoryStatus,
} from './story.constants.js';

@Injectable()
export class StoriesService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly databaseClient: DatabaseClient,
  ) {}

  async create(ownerId: string, input: CreateStoryDto): Promise<Story> {
    const [story] = await this.databaseClient.database
      .insert(stories)
      .values({
        ownerId,
        title: this.requiredText(input.title),
        subtitle: this.optionalText(input.subtitle),
        description: this.optionalText(input.description),
        coverKey: input.coverKey ?? null,
        writingLanguage: this.requiredText(input.writingLanguage ?? 'English'),
      })
      .returning();

    if (!story) {
      throw new Error('Failed to create story.');
    }

    return story;
  }

  async list(ownerId: string, query: ListStoriesDto): Promise<Story[]> {
    const conditions: SQL[] = [eq(stories.ownerId, ownerId)];
    const search = query.search?.trim();

    if (query.status) {
      conditions.push(eq(stories.status, query.status));
    }

    if (search) {
      const pattern = `%${search}%`;
      const searchCondition = or(
        ilike(stories.title, pattern),
        ilike(stories.subtitle, pattern),
        ilike(stories.description, pattern),
      );

      if (searchCondition) conditions.push(searchCondition);
    }

    const sortColumn =
      query.sort === 'createdAt'
        ? stories.createdAt
        : query.sort === 'title'
          ? stories.title
          : stories.updatedAt;
    const orderBy = query.order === 'asc' ? asc(sortColumn) : desc(sortColumn);

    return this.databaseClient.database
      .select()
      .from(stories)
      .where(and(...conditions))
      .orderBy(orderBy);
  }

  async get(ownerId: string, storyId: string): Promise<Story> {
    return this.findOwned(ownerId, storyId);
  }

  async update(
    ownerId: string,
    storyId: string,
    input: UpdateStoryDto,
  ): Promise<Story> {
    const current = await this.findOwned(ownerId, storyId);
    const changes: Partial<NewStory> = { updatedAt: new Date() };

    if (input.title !== undefined) {
      changes.title = this.requiredText(input.title);
    }
    if (input.subtitle !== undefined) {
      changes.subtitle = this.optionalText(input.subtitle);
    }
    if (input.description !== undefined) {
      changes.description = this.optionalText(input.description);
    }
    if (input.coverKey !== undefined) {
      changes.coverKey = input.coverKey;
    }
    if (input.writingLanguage !== undefined) {
      changes.writingLanguage = this.requiredText(input.writingLanguage);
    }
    if (input.status !== undefined) {
      this.assertStatusTransition(current.status, input.status);
      changes.status = input.status;
    }

    const [updated] = await this.databaseClient.database
      .update(stories)
      .set(changes)
      .where(and(eq(stories.id, storyId), eq(stories.ownerId, ownerId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Story not found.');
    }

    return updated;
  }

  async archive(ownerId: string, storyId: string): Promise<Story> {
    return this.update(ownerId, storyId, { status: 'archived' });
  }

  async restore(ownerId: string, storyId: string): Promise<Story> {
    const current = await this.findOwned(ownerId, storyId);

    if (current.status !== 'archived') {
      throw new BadRequestException('Only archived stories can be restored.');
    }

    return this.update(ownerId, storyId, { status: 'draft' });
  }

  async delete(
    ownerId: string,
    storyId: string,
    input: DeleteStoryDto,
  ): Promise<void> {
    const current = await this.findOwned(ownerId, storyId);

    if (input.confirmationTitle.trim() !== current.title) {
      throw new BadRequestException(
        'Enter the exact story title to confirm deletion.',
      );
    }

    await this.databaseClient.database
      .delete(stories)
      .where(and(eq(stories.id, storyId), eq(stories.ownerId, ownerId)));
  }

  private async findOwned(ownerId: string, storyId: string): Promise<Story> {
    const [story] = await this.databaseClient.database
      .select()
      .from(stories)
      .where(and(eq(stories.id, storyId), eq(stories.ownerId, ownerId)))
      .limit(1);

    if (!story) {
      throw new NotFoundException('Story not found.');
    }

    return story;
  }

  private assertStatusTransition(
    current: StoryStatus,
    next: StoryStatus,
  ): void {
    if (!canTransitionStoryStatus(current, next)) {
      throw new BadRequestException(
        `A story cannot move from ${current} to ${next}.`,
      );
    }
  }

  private requiredText(value: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException('Required text fields cannot be blank.');
    }

    return normalized;
  }

  private optionalText(value: string | undefined): string | null {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }
}
