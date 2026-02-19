import { Injectable, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';
import { EntriesRepository } from './entries.repository';
import { CreateEntryDto } from './dto/create-entry.dto';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { getNotFoundMessage } from '../../common/filters/http-exception.filter';

@Injectable()
export class EntriesService {
  constructor(private readonly repository: EntriesRepository) {}

  async findAll(userId: string): Promise<LedgerEntry[]> {
    return this.repository.findAllOrderByDateDesc(userId);
  }

  async findOne(id: string, userId: string): Promise<LedgerEntry> {
    const entry = await this.repository.findById(id, userId);
    if (!entry) {
      throw new NotFoundException(getNotFoundMessage());
    }
    return entry;
  }

  async create(dto: CreateEntryDto, userId: string): Promise<LedgerEntry> {
    const id = uuidv4();
    return this.repository.create(dto, id, userId);
  }

  async update(id: string, dto: CreateEntryDto, userId: string): Promise<LedgerEntry> {
    const existing = await this.repository.findById(id, userId);
    if (!existing) {
      throw new NotFoundException(getNotFoundMessage());
    }
    return this.repository.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const existing = await this.repository.findById(id, userId);
    if (!existing) {
      throw new NotFoundException(getNotFoundMessage());
    }
    await this.repository.remove(id, userId);
  }

  async importEntries(
    rawEntries: unknown[],
    userId: string,
  ): Promise<{
    created: number;
    failed: number;
    entries: LedgerEntry[];
    errors: string[];
  }> {
    const entries: LedgerEntry[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawEntries.length; i++) {
      const item = rawEntries[i];
      const dto = plainToInstance(CreateEntryDto, item);
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

  async getSummaryByPeriod(period: string, userId: string): Promise<{
    totalIncome: number;
    totalExpense: number;
    balance: number;
    period: string;
  }> {
    const { totalIncome, totalExpense } =
      await this.repository.getSummaryByPeriod(period, userId);
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      period,
    };
  }
}
