import {
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE_CLIENT } from '../../infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../../infrastructure/database/database.js';
import {
  profiles,
  users,
  type User,
} from '../../infrastructure/database/schema.js';
import { PasswordService } from '../auth/security/password.service.js';
import { toSafeUser, type SafeUser } from './user.types.js';

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly databaseClient: DatabaseClient,
    private readonly passwordService: PasswordService,
  ) {}

  async findById(id: string): Promise<User | null> {
    const [user] = await this.databaseClient.database
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = this.normalizeEmail(email);

    const [user] = await this.databaseClient.database
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    return user ?? null;
  }

  async create(input: CreateUserInput): Promise<SafeUser> {
    const email = this.normalizeEmail(input.email);

    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists.',
      );
    }

    const passwordHash = await this.passwordService.hash(input.password);

    try {
      const createdUser = await this.databaseClient.database.transaction(
        async (transaction) => {
          const [user] = await transaction
            .insert(users)
            .values({
              email,
              passwordHash,
              displayName: input.displayName.trim(),
            })
            .returning();

          if (!user) {
            throw new Error('Failed to create user.');
          }

          await transaction.insert(profiles).values({
            userId: user.id,
            preferredName: user.displayName,
          });

          return user;
        },
      );

      return toSafeUser(createdUser);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }

      throw error;
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isUniqueViolation(error: unknown): boolean {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error)
    ) {
      return false;
    }

    return error.code === '23505';
  }
}