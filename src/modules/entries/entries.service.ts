import { Injectable, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';
import { EntriesRepository } from './entries.repository';
import { LedgerService } from '../ledger/ledger.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { getNotFoundMessage } from '../../common/filters/http-exception.filter';

@Injectable()
export class EntriesService {
  constructor(
    private readonly repository: EntriesRepository,
    private readonly ledgerService: LedgerService,
  ) {}

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
    balance: number;
    period: string;
  }> {
    await this.ledgerService.ensureMember(userId, ledgerId);
    const { totalIncome, totalExpense } =
      await this.repository.getSummaryByPeriod(period, ledgerId);
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      period,
    };
  }
}
