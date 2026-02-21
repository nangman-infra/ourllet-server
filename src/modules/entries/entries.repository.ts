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

  /** 해당 기간 지출(type=expense) 항목별 금액 합계. 제목(title)으로 그룹, 금액 내림차순 (결산 파이차트용) */
  async getExpenseBreakdownByTitle(
    ledgerId: string,
    start: string,
    end: string,
  ): Promise<{ title: string; amount: number }[]> {
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('e.title', 'title')
      .addSelect('SUM(e.amount)', 'amount')
      .where('e.ledgerId = :ledgerId', { ledgerId })
      .andWhere('e.type = :type', { type: 'expense' })
      .andWhere('e.date >= :start', { start })
      .andWhere('e.date <= :end', { end })
      .groupBy('e.title')
      .orderBy('SUM(e.amount)', 'DESC')
      .getRawMany<{ title: string; amount: string }>();
    return rows.map((r) => ({ title: r.title, amount: parseFloat(r.amount) }));
  }

  /** 해당 기간 특정 type 합계 (income 또는 savings) */
  async getSumByType(
    ledgerId: string,
    start: string,
    end: string,
    type: 'income' | 'savings',
  ): Promise<number> {
    const r = await this.repo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount), 0)', 'sum')
      .where('e.ledgerId = :ledgerId', { ledgerId })
      .andWhere('e.type = :type', { type })
      .andWhere('e.date >= :start', { start })
      .andWhere('e.date <= :end', { end })
      .getRawOne<{ sum: string }>();
    return r ? parseFloat(r.sum) : 0;
  }

  /** 해당 기간 수입(income) 건별 목록. 디버깅용 (결산 totalIncome 검증) */
  async getIncomeEntriesInPeriod(
    ledgerId: string,
    start: string,
    end: string,
  ): Promise<{ id: string; date: string; amount: number }[]> {
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('e.id', 'id')
      .addSelect('e.date', 'date')
      .addSelect('e.amount', 'amount')
      .where('e.ledgerId = :ledgerId', { ledgerId })
      .andWhere('e.type = :type', { type: 'income' })
      .andWhere('e.date >= :start', { start })
      .andWhere('e.date <= :end', { end })
      .orderBy('e.date', 'ASC')
      .getRawMany<{ id: string; date: string; amount: string }>();
    return rows.map((r) => ({ id: r.id, date: r.date, amount: parseFloat(r.amount) }));
  }

  /** 해당 기간 지출(expense) 카테고리별 금액 합계. category null 가능 */
  async getExpenseGroupByCategory(
    ledgerId: string,
    start: string,
    end: string,
  ): Promise<{ category: string | null; amount: number }[]> {
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('e.category', 'category')
      .addSelect('SUM(e.amount)', 'amount')
      .where('e.ledgerId = :ledgerId', { ledgerId })
      .andWhere('e.type = :type', { type: 'expense' })
      .andWhere('e.date >= :start', { start })
      .andWhere('e.date <= :end', { end })
      .groupBy('e.category')
      .getRawMany<{ category: string | null; amount: string }>();
    return rows.map((r) => ({
      category: r.category ?? null,
      amount: parseFloat(r.amount),
    }));
  }
}
