import { Module } from '@nestjs/common';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';
import { EntriesModule } from '../entries/entries.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [EntriesModule, AuthModule],
  controllers: [SummaryController],
  providers: [SummaryService],
})
export class SummaryModule {}
