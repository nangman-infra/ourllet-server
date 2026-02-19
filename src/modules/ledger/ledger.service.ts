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
}
