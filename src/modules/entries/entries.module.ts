import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { EntriesRepository } from './entries.repository';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([LedgerEntry]), AuthModule],
  controllers: [EntriesController],
  providers: [EntriesRepository, EntriesService],
  exports: [EntriesService, EntriesRepository],
})
export class EntriesModule {}
