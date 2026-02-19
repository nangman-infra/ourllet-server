import { Injectable, BadRequestException } from '@nestjs/common';
import { EntriesService } from '../entries/entries.service';

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

@Injectable()
export class SummaryService {
  constructor(private readonly entriesService: EntriesService) {}

  async getSummaryByPeriod(period: string, userId: string): Promise<{
    totalIncome: number;
    totalExpense: number;
    balance: number;
    period: string;
  }> {
    if (!period || !PERIOD_PATTERN.test(period)) {
      throw new BadRequestException('period는 YYYY-MM 형식이어야 해요.');
    }
    return this.entriesService.getSummaryByPeriod(period, userId);
  }
}
