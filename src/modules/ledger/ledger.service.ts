import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ledger } from './entities/ledger.entity';
import { LedgerMember } from './entities/ledger-member.entity';
import { LedgerEntry } from '../entries/entities/ledger-entry.entity';
import { getNotFoundMessage } from '../../common/filters/http-exception.filter';

const INVITE_CODE_LENGTH = 6;
const MAX_MEMBERS_PER_LEDGER = 2;

function generateInviteCode(): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(Ledger)
    private readonly ledgerRepo: Repository<Ledger>,
    @InjectRepository(LedgerMember)
    private readonly memberRepo: Repository<LedgerMember>,
    @InjectRepository(LedgerEntry)
    private readonly entryRepo: Repository<LedgerEntry>,
  ) {}

  /** 6자리 초대코드 생성(유일할 때까지 재시도) */
  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 100; attempt++) {
      const code = generateInviteCode();
      const exists = await this.ledgerRepo.findOne({ where: { id: code } });
      if (!exists) return code;
    }
    throw new Error('Failed to generate unique invite code');
  }

  /** 가계부 만들고 현재 사용자를 멤버로 추가 → 초대코드 반환 */
  async createLedger(userId: string): Promise<{ ledgerId: string; code: string }> {
    const code = await this.generateUniqueCode();
    const ledger = this.ledgerRepo.create({ id: code });
    await this.ledgerRepo.save(ledger);
    await this.memberRepo.save(
      this.memberRepo.create({ ledgerId: code, userId }),
    );
    return { ledgerId: code, code };
  }

  /** 가계부 만들 때 이름 지정 (회원가입 시 최초 가계부용) */
  async createLedgerWithName(
    userId: string,
    name: string,
  ): Promise<{ ledgerId: string; code: string }> {
    const code = await this.generateUniqueCode();
    const ledger = this.ledgerRepo.create({
      id: code,
      name: name.trim() || null,
    });
    await this.ledgerRepo.save(ledger);
    await this.memberRepo.save(
      this.memberRepo.create({ ledgerId: code, userId }),
    );
    return { ledgerId: code, code };
  }

  /** 초대코드로 가계부 참여. 한 가계부당 최대 2명 */
  async joinByCode(userId: string, code: string): Promise<{ ledgerId: string }> {
    const normalized = code.replace(/\s/g, '').slice(0, INVITE_CODE_LENGTH);
    if (normalized.length !== INVITE_CODE_LENGTH || !/^\d+$/.test(normalized)) {
      throw new BadRequestException('초대코드는 6자리 숫자예요.');
    }

    const ledger = await this.ledgerRepo.findOne({ where: { id: normalized } });
    if (!ledger) {
      throw new NotFoundException('해당 초대코드의 가계부가 없어요.');
    }

    const existing = await this.memberRepo.findOne({
      where: { ledgerId: normalized, userId },
    });
    if (existing) {
      return { ledgerId: normalized };
    }

    const count = await this.memberRepo.count({ where: { ledgerId: normalized } });
    if (count >= MAX_MEMBERS_PER_LEDGER) {
      throw new ConflictException('이 가계부는 이미 2명이 사용 중이에요.');
    }

    await this.memberRepo.save(
      this.memberRepo.create({ ledgerId: normalized, userId }),
    );
    return { ledgerId: normalized };
  }

  /** 현재 사용자가 속한 가계부 목록 (ledgerId만) */
  async getMyLedgerIds(userId: string): Promise<string[]> {
    const rows = await this.memberRepo.find({
      where: { userId },
      select: ['ledgerId'],
      order: { ledgerId: 'ASC' },
    });
    return rows.map((r) => r.ledgerId);
  }

  /** 현재 사용자가 속한 가계부 목록 (ledgerId + name). name 있으면 해당 이름과 일치하는 것만 (초대코드 조회용) */
  async getMyLedgers(
    userId: string,
    name?: string,
  ): Promise<{ ledgerId: string; name: string | null }[]> {
    const memberRows = await this.memberRepo.find({
      where: { userId },
      select: ['ledgerId'],
      order: { ledgerId: 'ASC' },
    });
    if (memberRows.length === 0) return [];
    const ledgers = await this.ledgerRepo.find({
      where: memberRows.map((r) => ({ id: r.ledgerId })),
      select: ['id', 'name'],
    });
    const byId = new Map(ledgers.map((l) => [l.id, l.name]));
    let list = memberRows.map((r) => ({
      ledgerId: r.ledgerId,
      name: byId.get(r.ledgerId) ?? null,
    }));
    if (name != null && name.trim() !== '') {
      const trimmed = name.trim();
      list = list.filter((item) => item.name === trimmed);
    }
    return list;
  }

  /** 가계부 설정 수정 (이름 등). 멤버만 가능. */
  async updateLedger(
    userId: string,
    ledgerId: string,
    updates: { name?: string },
  ): Promise<{ ledgerId: string; name: string | null }> {
    const normalized = ledgerId.replace(/\s/g, '').slice(0, 6);
    if (normalized.length !== 6 || !/^\d+$/.test(normalized)) {
      throw new BadRequestException('가계부 코드는 6자리 숫자예요.');
    }
    await this.ensureMember(userId, normalized);

    const ledger = await this.ledgerRepo.findOne({ where: { id: normalized } });
    if (!ledger) throw new NotFoundException(getNotFoundMessage());

    if (updates.name !== undefined) {
      ledger.name = updates.name === '' ? null : updates.name;
      await this.ledgerRepo.save(ledger);
    }
    return { ledgerId: normalized, name: ledger.name };
  }

  /** 해당 가계부 멤버인지 확인 */
  async isMember(userId: string, ledgerId: string): Promise<boolean> {
    const one = await this.memberRepo.findOne({
      where: { ledgerId, userId },
    });
    return !!one;
  }

  /** 멤버가 아니면 403/404 처리 */
  async ensureMember(userId: string, ledgerId: string): Promise<void> {
    const ok = await this.isMember(userId, ledgerId);
    if (!ok) {
      throw new NotFoundException(getNotFoundMessage());
    }
  }

  /** 가계부 삭제. 멤버만 가능. 해당 가계부 내역·멤버·가계부 순으로 삭제 */
  async deleteLedger(userId: string, code: string): Promise<void> {
    const normalized = code.replace(/\s/g, '').slice(0, INVITE_CODE_LENGTH);
    if (normalized.length !== INVITE_CODE_LENGTH || !/^\d+$/.test(normalized)) {
      throw new BadRequestException('가계부 코드는 6자리 숫자예요.');
    }

    await this.ensureMember(userId, normalized);

    await this.entryRepo.delete({ ledgerId: normalized });
    await this.memberRepo.delete({ ledgerId: normalized });
    await this.ledgerRepo.delete({ id: normalized });
  }
}
