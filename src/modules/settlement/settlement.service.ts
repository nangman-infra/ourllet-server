import { Injectable, BadRequestException } from '@nestjs/common';
import { EntriesService } from '../entries/entries.service';
import { FixedService } from '../fixed/fixed.service';
import { FixedEntry } from '../fixed/entities/fixed-entry.entity';

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

export type SettlementItemType = 'fixed' | 'savings' | 'expense';

export interface SettlementItem {
  label: string;
  amount: number;
  type: SettlementItemType;
}

@Injectable()
export class SettlementService {
  constructor(
    private readonly entriesService: EntriesService,
    private readonly fixedService: FixedService,
  ) {}

  async getSettlement(
    period: string,
    userId: string,
    ledgerId: string,
    options?: { debug?: boolean },
  ): Promise<{
    period: string;
    totalIncome: number;
    items: SettlementItem[];
    _debug?: {
      dateRange: { start: string; end: string };
      incomeFromEntries: number;
      fixedIncomeSum: number;
      totalIncome: number;
      incomeEntries: { id: string; date: string; amount: number }[];
    };
  }> {
    if (!period || !PERIOD_PATTERN.test(period)) {
      throw new BadRequestException('period는 YYYY-MM 형식이어야 해요.');
    }

    const [y, m] = period.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const dateRange = {
      start: `${period}-01`,
      end: `${period}-${String(lastDay).padStart(2, '0')}`,
    };

    const defaultExpenseCategories = this.fixedService.getCategories().expense;
    const [incomeFromEntries, savingsSum, expenseByCategory, fixedEntries, incomeEntries] =
      await Promise.all([
        this.entriesService.getSumByType(period, userId, ledgerId, 'income'),
        this.entriesService.getSumByType(period, userId, ledgerId, 'savings'),
        this.entriesService.getExpenseGroupByCategory(period, userId, ledgerId),
        this.fixedService.findAll(userId, ledgerId),
        options?.debug
          ? this.entriesService.getIncomeEntriesInPeriod(period, userId, ledgerId)
          : Promise.resolve([]),
      ]);

    const items: SettlementItem[] = [];

    // 고정비: 해당 월 적용분만 (excludedDates 반영), type=expense만
    let fixedIncomeSum = 0;
    for (const entry of fixedEntries as FixedEntry[]) {
      const dateInMonth = this.getOccurrenceDateInMonth(period, entry.dayOfMonth);
      const excluded = (entry.excludedDates ?? []).includes(dateInMonth);
      if (excluded) continue;
      if (entry.type === 'income') {
        fixedIncomeSum += Number(entry.amount);
      } else {
        items.push({
          label: (entry.title ?? entry.category) || '고정비',
          amount: Number(entry.amount),
          type: 'fixed',
        });
      }
    }

    // totalIncome = 해당 월 총 수입만 (일반 수입 + 고정 수입). 지출·저축·고정비를 빼지 않음.
    const totalIncome = incomeFromEntries + fixedIncomeSum;

    // 저축: 합계 1개
    if (savingsSum > 0) {
      items.push({ label: '저축', amount: savingsSum, type: 'savings' });
    }

    // 지출: 기본 카테고리별 + 기타
    const defaultSet = new Set(defaultExpenseCategories);
    const categoryToAmount = new Map<string, number>();
    let etcAmount = 0;
    for (const { category, amount } of expenseByCategory) {
      const key = category?.trim() || '';
      if (!key || !defaultSet.has(key)) {
        etcAmount += amount;
      } else {
        categoryToAmount.set(key, (categoryToAmount.get(key) ?? 0) + amount);
      }
    }
    for (const cat of defaultExpenseCategories) {
      const amt = categoryToAmount.get(cat) ?? 0;
      if (amt > 0) items.push({ label: cat, amount: amt, type: 'expense' });
    }
    if (etcAmount > 0) items.push({ label: '기타', amount: etcAmount, type: 'expense' });

    items.sort((a, b) => b.amount - a.amount);

    const result: {
      period: string;
      totalIncome: number;
      items: SettlementItem[];
      _debug?: {
        dateRange: { start: string; end: string };
        incomeFromEntries: number;
        fixedIncomeSum: number;
        totalIncome: number;
        incomeEntries: { id: string; date: string; amount: number }[];
      };
    } = { period, totalIncome, items };
    if (options?.debug) {
      result._debug = {
        dateRange,
        incomeFromEntries,
        fixedIncomeSum,
        totalIncome,
        incomeEntries,
      };
    }
    return result;
  }

  private getOccurrenceDateInMonth(period: string, dayOfMonth: number): string {
    const [y, m] = period.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const day = Math.min(Math.max(1, dayOfMonth), lastDay);
    const padded = String(day).padStart(2, '0');
    return `${period}-${padded}`;
  }
}
