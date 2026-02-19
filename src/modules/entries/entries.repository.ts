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

  async findAllOrderByDateDesc(userId: string): Promise<LedgerEntry[]> {
    return this.repo.find({
      where: { userId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findById(id: string, userId: string): Promise<LedgerEntry | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async create(dto: CreateEntryDto, id: string, userId: string): Promise<LedgerEntry> {
    const entity = this.repo.create({
      id,
      userId,
      type: dto.type,
      amount: dto.amount,
      title: dto.title,
      memo: dto.memo ?? null,
      date: dto.date,
    });
    return this.repo.save(entity);
  }

  async update(id: string, dto: CreateEntryDto, userId: string): Promise<LedgerEntry> {
    await this.repo.update({ id, userId }, {
      type: dto.type,
      amount: dto.amount,
      title: dto.title,
      memo: dto.memo ?? null,
      date: dto.date,
    });
    const updated = await this.findById(id, userId);
    if (!updated) throw new Error('Entry not found after update');
    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.repo.delete({ id, userId });
  }

  async createMany(
    dtos: CreateEntryDto[],
    ids: string[],
    userId: string,
  ): Promise<LedgerEntry[]> {
    const entities = dtos.map((dto, i) =>
      this.repo.create({
        id: ids[i],
        userId,
        type: dto.type,
        amount: dto.amount,
        title: dto.title,
        memo: dto.memo ?? null,
        date: dto.date,
      }),
    );
    return this.repo.save(entities);
  }

  async getSummaryByPeriod(
    period: string,
    userId: string,
  ): Promise<{ totalIncome: number; totalExpense: number }> {
    const [start, end] = [
      `${period}-01`,
      new Date(
        new Date(`${period}-01`).getFullYear(),
        new Date(`${period}-01`).getMonth() + 1,
        0,
      )
        .toISOString()
        .slice(0, 10),
    ];

    const result = await this.repo
      .createQueryBuilder('e')
      .select('e.type', 'type')
      .addSelect('SUM(e.amount)', 'sum')
      .where('e.userId = :userId', { userId })
      .andWhere('e.date >= :start', { start })
      .andWhere('e.date <= :end', { end })
      .groupBy('e.type')
      .getRawMany<{ type: string; sum: string }>();

    let totalIncome = 0;
    let totalExpense = 0;
    for (const row of result) {
      const sum = parseFloat(row.sum);
      if (row.type === 'income') totalIncome = sum;
      else totalExpense = sum;
    }
    return { totalIncome, totalExpense };
  }
}
