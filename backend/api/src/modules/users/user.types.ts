import type { User } from '../../infrastructure/database/schema.js';

export type SafeUser = Omit<User, 'passwordHash'>;

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;

  return safeUser;
}