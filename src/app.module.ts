import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER } from '@nestjs/core';
import { HealthModule } from './modules/health/health.module';
import { EntriesModule } from './modules/entries/entries.module';
import { SummaryModule } from './modules/summary/summary.module';
import { LedgerEntry } from './modules/entries/entities/ledger-entry.entity';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      username: process.env.DATABASE_USER ?? 'ourllet',
      password: process.env.DATABASE_PASSWORD ?? 'slow1234',
      database: process.env.DATABASE_NAME ?? 'ourllet',
      entities: [LedgerEntry],
      synchronize: process.env.NODE_ENV !== 'production',
      retryAttempts: 3,
      retryDelay: 2000,
    }),
    HealthModule,
    EntriesModule,
    SummaryModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
