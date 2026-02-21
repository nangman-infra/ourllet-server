import { Injectable, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';
import { EntriesRepository } from './entries.repository';
import { LedgerService } from '../ledger/ledger.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { LedgerEntry, DEFAULT_SAVINGS_CATEGORIES } from './entities/ledger-entry.entity';
import { getNotFoundMessage } from '../../common/filters/http-exception.filter';

@Injectable()
export class EntriesService {
  constructor(
    private readonly repository: EntriesRepository,
    private readonly ledgerService: LedgerService,
  ) {}

  /** 저축 기본 카테고리 (예금, 적금, 주식, 채권). 직접 추가도 가능 */
  getSavingsCategories(): string[] {
    return [...DEFAULT_SAVINGS_CATEGORIES];
  }

  async findAll(userId: string, ledgerId: string): Promise<LedgerEntry[]> {
    await this.ledgerService.ensureMember(userId, ledgerId);
    return this.repository.findAllOrderByDateDesc(ledgerId);
  }

  async findOne(id: string, userId: string): Promise<LedgerEntry> {
    const entry = await this.repository.findByIdOnly(id);
    if (!entry) throw new NotFoundException(getNotFoundMessage());
    await this.ledgerService.ensureMember(userId, entry.ledgerId);
    return entry;
  }

  async create(dto: CreateEntryDto, userId: string): Promise<LedgerEntry> {
    await this.ledgerService.ensureMember(userId, dto.ledgerId);
    const id = uuidv4();
    return this.repository.create(dto, id, userId);
  }

  async update(id: string, dto: CreateEntryDto, userId: string): Promise<LedgerEntry> {
    const existing = await this.repository.findByIdOnly(id);
    if (!existing) throw new NotFoundException(getNotFoundMessage());
    await this.ledgerService.ensureMember(userId, existing.ledgerId);
    return this.repository.update(id, dto, existing.ledgerId, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const existing = await this.repository.findByIdOnly(id);
    if (!existing) throw new NotFoundException(getNotFoundMessage());
    await this.ledgerService.ensureMember(userId, existing.ledgerId);
    await this.repository.remove(id, existing.ledgerId);
  }

  async importEntries(
    rawEntries: unknown[],
    userId: string,
    ledgerId: string,
  ): Promise<{
    created: number;
    failed: number;
    entries: LedgerEntry[];
    errors: string[];
  }> {
    await this.ledgerService.ensureMember(userId, ledgerId);
    const entries: LedgerEntry[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawEntries.length; i++) {
      const item = rawEntries[i];
      const dto = plainToInstance(CreateEntryDto, item);
      if (!dto.ledgerId) dto.ledgerId = ledgerId;
      const validationErrors = await validate(dto);

      if (validationErrors.length > 0) {
        const messages = validationErrors
          .flatMap((e) => Object.values(e.constraints ?? {}))
          .join(', ');
        errors.push(`[${i}] ${messages}`);
        continue;
      }

      try {
        const id = uuidv4();
        const created = await this.repository.create(dto as CreateEntryDto, id, userId);
        entries.push(created);
      } catch {
        errors.push(`[${i}] 저장 중 오류가 났어요.`);
      }
    }

    return {
      created: entries.length,
      failed: errors.length,
      entries,
      errors,
    };
  }

  async getSummaryByPeriod(
    period: string,
    userId: string,
    ledgerId: string,
  ): Promise<{
    totalIncome: number;
    totalExpense: number;
    totalSavings: number;
    balance: number;
    period: string;
  }> {
    await this.ledgerService.ensureMember(userId, ledgerId);
    const { totalIncome, totalExpense, totalSavings } =
      await this.repository.getSummaryByPeriod(period, ledgerId);
    return {
      totalIncome,
      totalExpense,
      totalSavings,
      balance: totalIncome - (totalExpense + totalSavings),
      period,
    };
  }

  /** 해당 월 지출 항목별 금액 집계 (결산 탭 파이차트용). 제목으로 그룹, 금액 내림차순 */
  async getExpenseBreakdownByTitle(
    period: string,
    userId: string,
    ledgerId: string,
  ): Promise<{ period: string; items: { title: string; amount: number }[] }> {
    await this.ledgerService.ensureMember(userId, ledgerId);
    const [start, end] = this.getPeriodBounds(period);
    const items = await this.repository.getExpenseBreakdownByTitle(
      ledgerId,
      start,
      end,
    );
    return { period, items };
  }

  /** 해당 월 특정 type 합계 (income | savings). ensureMember 후 호출 */
  async getSumByType(
    period: string,
    userId: string,
    ledgerId: string,
    type: 'income' | 'savings',
  ): Promise<number> {
    await this.ledgerService.ensureMember(userId, ledgerId);
    const [start, end] = this.getPeriodBounds(period);
    return this.repository.getSumByType(ledgerId, start, end, type);
  }

  /** 해당 월 지출 카테고리별 합계. ensureMember 후 호출 */
  async getExpenseGroupByCategory(
    period: string,
    userId: string,
    ledgerId: string,
  ): Promise<{ category: string | null; amount: number }[]> {
    await this.ledgerService.ensureMember(userId, ledgerId);
    const [start, end] = this.getPeriodBounds(period);
    return this.repository.getExpenseGroupByCategory(ledgerId, start, end);
  }

  private getPeriodBounds(period: string): [string, string] {
    const start = `${period}-01`;
    const end = new Date(
      new Date(`${period}-01`).getFullYear(),
      new Date(`${period}-01`).getMonth() + 1,
      0,
    )
      .toISOString()
      .slice(0, 10);
    return [start, end];
  }
}
