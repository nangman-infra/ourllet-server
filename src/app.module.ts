import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER } from '@nestjs/core';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { EntriesModule } from './modules/entries/entries.module';
import { SummaryModule } from './modules/summary/summary.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { LedgerEntry } from './modules/entries/entities/ledger-entry.entity';
import { User } from './modules/auth/entities/user.entity';
import { Ledger } from './modules/ledger/entities/ledger.entity';
import { LedgerMember } from './modules/ledger/entities/ledger-member.entity';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      username: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      database: process.env.DATABASE_NAME ?? 'ourllet',
      entities: [LedgerEntry, User, Ledger, LedgerMember],
      // 앱 기동 시 users, ledger_entries 테이블 자동 생성. 마이그레이션 도입 전까지 사용.
      synchronize: true,
      retryAttempts: 3,
      retryDelay: 2000,
    }),
    HealthModule,
    AuthModule,
    LedgerModule,
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
