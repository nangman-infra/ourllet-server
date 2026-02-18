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

  async findAll(): Promise<LedgerEntry[]> {
    return this.repository.findAllOrderByDateDesc();
  }

  async findOne(id: string): Promise<LedgerEntry> {
    const entry = await this.repository.findById(id);
    if (!entry) {
      throw new NotFoundException(getNotFoundMessage());
    }
    return entry;
  }

  async create(dto: CreateEntryDto): Promise<LedgerEntry> {
    const id = uuidv4();
    return this.repository.create(dto, id);
  }

  async update(id: string, dto: CreateEntryDto): Promise<LedgerEntry> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(getNotFoundMessage());
    }
    return this.repository.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(getNotFoundMessage());
    }
    await this.repository.remove(id);
  }

  async importEntries(
    rawEntries: unknown[],
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
        const created = await this.repository.create(dto as CreateEntryDto, id);
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

  async getSummaryByPeriod(period: string): Promise<{
    totalIncome: number;
    totalExpense: number;
    balance: number;
    period: string;
  }> {
    const { totalIncome, totalExpense } =
      await this.repository.getSummaryByPeriod(period);
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      period,
    };
  }
}
