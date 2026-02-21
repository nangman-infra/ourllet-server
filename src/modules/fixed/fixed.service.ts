import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FixedEntry } from './entities/fixed-entry.entity';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from './entities/fixed-entry.entity';
import { LedgerService } from '../ledger/ledger.service';
import { CreateFixedEntryDto } from './dto/create-fixed-entry.dto';
import { UpdateFixedEntryDto } from './dto/update-fixed-entry.dto';
import { getNotFoundMessage } from '../../common/filters/http-exception.filter';

@Injectable()
export class FixedService {
  constructor(
    @InjectRepository(FixedEntry)
    private readonly repo: Repository<FixedEntry>,
    private readonly ledgerService: LedgerService,
  ) {}

  /** 기본 카테고리 목록 (고정비 지출/수입) */
  getCategories(): {
    expense: string[];
    income: string[];
  } {
    return {
      expense: [...DEFAULT_EXPENSE_CATEGORIES],
      income: [...DEFAULT_INCOME_CATEGORIES],
    };
  }

  /** 가계부별 고정비 목록 */
  async findAll(userId: string, ledgerId: string): Promise<FixedEntry[]> {
    await this.ledgerService.ensureMember(userId, ledgerId);
    return this.repo.find({
      where: { ledgerId },
      order: { type: 'ASC', dayOfMonth: 'ASC', createdAt: 'ASC' },
    });
  }

  /** 단건 조회 */
  async findOne(id: string, userId: string): Promise<FixedEntry> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException(getNotFoundMessage());
    await this.ledgerService.ensureMember(userId, entry.ledgerId);
    return entry;
  }

  /** 생성 */
  async create(dto: CreateFixedEntryDto, userId: string): Promise<FixedEntry> {
    await this.ledgerService.ensureMember(userId, dto.ledgerId);
    this.validateDayOfMonth(dto.dayOfMonth);
    const id = uuidv4();
    const entity = this.repo.create({
      id,
      ledgerId: dto.ledgerId,
      userId,
      type: dto.type,
      title: dto.title.trim(),
      category: dto.category.trim(),
      amount: dto.amount,
      dayOfMonth: dto.dayOfMonth,
      memo: dto.memo?.trim() ?? null,
    });
    return this.repo.save(entity);
  }

  /** 수정 */
  async update(
    id: string,
    dto: UpdateFixedEntryDto,
    userId: string,
  ): Promise<FixedEntry> {
    const entry = await this.findOne(id, userId);
    if (dto.dayOfMonth != null) this.validateDayOfMonth(dto.dayOfMonth);
    if (dto.title != null) entry.title = dto.title.trim();
    if (dto.category != null) entry.category = dto.category.trim();
    if (dto.amount != null) entry.amount = dto.amount;
    if (dto.dayOfMonth != null) entry.dayOfMonth = dto.dayOfMonth;
    if (dto.memo !== undefined) entry.memo = dto.memo?.trim() ?? null;
    return this.repo.save(entry);
  }

  /** 삭제 */
  async remove(id: string, userId: string): Promise<void> {
    const entry = await this.findOne(id, userId);
    await this.repo.remove(entry);
  }

  private validateDayOfMonth(day: number): void {
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new BadRequestException('지출/수입 날짜는 1–31 사이의 정수여야 해요.');
    }
  }
}
