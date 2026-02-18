import { Module } from '@nestjs/common';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';
import { EntriesModule } from '../entries/entries.module';

@Module({
  imports: [EntriesModule],
  controllers: [SummaryController],
  providers: [SummaryService],
})
export class SummaryModule {}
