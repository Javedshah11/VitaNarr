import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  createDatabaseClient,
  type DatabaseClient,
} from './database.js';
import { DATABASE_CLIENT } from './database.constants.js';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DatabaseClient =>
        createDatabaseClient(config.getOrThrow<string>('DATABASE_URL')),
    },
  ],
  exports: [DATABASE_CLIENT],
})
export class DatabaseModule {}