import { Injectable, BadRequestException } from '@nestjs/common';
import { EntriesService } from '../entries/entries.service';

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

@Injectable()
export class SettlementService {
  constructor(private readonly entriesService: EntriesService) {}

  async getExpenseBreakdown(
    period: string,
    userId: string,
    ledgerId: string,
  ): Promise<{ period: string; items: { title: string; amount: number }[] }> {
    if (!period || !PERIOD_PATTERN.test(period)) {
      throw new BadRequestException('period는 YYYY-MM 형식이어야 해요.');
    }
    return this.entriesService.getExpenseBreakdownByTitle(period, userId, ledgerId);
  }
}
