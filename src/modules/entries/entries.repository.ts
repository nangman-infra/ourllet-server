import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { CreateEntryDto } from './dto/create-entry.dto';

@Injectable()
export class EntriesRepository {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly repo: Repository<LedgerEntry>,
  ) {}

  async findAllOrderByDateDesc(ledgerId: string): Promise<LedgerEntry[]> {
    return this.repo.find({
      where: { ledgerId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findById(id: string, ledgerId: string): Promise<LedgerEntry | null> {
    return this.repo.findOne({ where: { id, ledgerId } });
  }

  async findByIdOnly(id: string): Promise<LedgerEntry | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(dto: CreateEntryDto, id: string, userId: string): Promise<LedgerEntry> {
    const entity = this.repo.create({
      id,
      ledgerId: dto.ledgerId,
      userId,
      type: dto.type,
      amount: dto.amount,
      title: dto.title,
      category: dto.category != null && dto.category !== '' ? dto.category.trim() : null,
      memo: dto.memo ?? null,
      date: dto.date,
    });
    return this.repo.save(entity);
  }

  async update(id: string, dto: CreateEntryDto, ledgerId: string, userId: string): Promise<LedgerEntry> {
    await this.repo.update({ id, ledgerId }, {
      type: dto.type,
      amount: dto.amount,
      title: dto.title,
      category: dto.category != null && dto.category !== '' ? dto.category.trim() : null,
      memo: dto.memo ?? null,
      date: dto.date,
    });
    const updated = await this.findById(id, ledgerId);
    if (!updated) throw new Error('Entry not found after update');
    return updated;
  }

  async remove(id: string, ledgerId: string): Promise<void> {
    await this.repo.delete({ id, ledgerId });
  }

  async createMany(
    dtos: CreateEntryDto[],
    ids: string[],
    userId: string,
  ): Promise<LedgerEntry[]> {
    const entities = dtos.map((dto, i) =>
      this.repo.create({
        id: ids[i],
        ledgerId: dto.ledgerId,
        userId,
        type: dto.type,
        amount: dto.amount,
        title: dto.title,
        category: dto.category != null && dto.category !== '' ? dto.category.trim() : null,
        memo: dto.memo ?? null,
        date: dto.date,
      }),
    );
    return this.repo.save(entities);
  }

  async getSummaryByPeriod(
    period: string,
    ledgerId: string,
  ): Promise<{ totalIncome: number; totalExpense: number; totalSavings: number }> {
    const [y, m] = period.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const start = `${period}-01`;
    const end = `${period}-${String(lastDay).padStart(2, '0')}`;

    const result = await this.repo
      .createQueryBuilder('e')
      .select('e.type', 'type')
      .addSelect('SUM(e.amount)', 'sum')
      .where('e.ledgerId = :ledgerId', { ledgerId })
      .andWhere('e.date >= :start', { start })
      .andWhere('e.date <= :end', { end })
      .groupBy('e.type')
      .getRawMany<{ type: string; sum: string }>();

    let totalIncome = 0;
    let totalExpense = 0;
    let totalSavings = 0;
    for (const row of result) {
      const sum = parseFloat(row.sum);
      if (row.type === 'income') totalIncome = sum;
      else if (row.type === 'expense') totalExpense = sum;
      else if (row.type === 'savings') totalSavings = sum;
    }
    return { totalIncome, totalExpense, totalSavings };
  }
}
