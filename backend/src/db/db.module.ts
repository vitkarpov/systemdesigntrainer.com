import { Global, Module } from '@nestjs/common';
import { db, pool } from './db';

// Provider tokens
export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';
export const DATABASE_POOL = 'DATABASE_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useValue: db,
    },
    {
      provide: DATABASE_POOL,
      useValue: pool,
    },
  ],
  exports: [DATABASE_CONNECTION, DATABASE_POOL],
})
export class DatabaseModule {}
