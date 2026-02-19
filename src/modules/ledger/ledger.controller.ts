import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { JoinLedgerDto } from './dto/join-ledger.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@Controller('v1/ledgers')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  /** 가계부로 초대하기: 6자리 초대코드 생성 및 가계부 생성, 현재 사용자 멤버로 추가 */
  @Post('invite-code')
  async createInviteCode(
    @CurrentUser() user: User,
  ): Promise<{ ledgerId: string; code: string }> {
    return this.ledgerService.createLedger(user.id);
  }

  /** 가계부에 참여하기: 초대코드로 참여 (최대 2명) */
  @Post('join')
  async join(
    @Body() dto: JoinLedgerDto,
    @CurrentUser() user: User,
  ): Promise<{ ledgerId: string }> {
    return this.ledgerService.joinByCode(user.id, dto.code);
  }

  /** 내가 속한 가계부 목록 (ledgerId 배열) */
  @Get()
  async list(@CurrentUser() user: User): Promise<{ ledgerIds: string[] }> {
    const ledgerIds = await this.ledgerService.getMyLedgerIds(user.id);
    return { ledgerIds };
  }
}
