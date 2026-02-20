import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { JoinLedgerDto } from './dto/join-ledger.dto';
import { UpdateLedgerDto } from './dto/update-ledger.dto';
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

  /** 내가 속한 가계부 목록 (ledgerId + name) */
  @Get()
  async list(
    @CurrentUser() user: User,
  ): Promise<{ ledgers: { ledgerId: string; name: string | null }[] }> {
    const ledgers = await this.ledgerService.getMyLedgers(user.id);
    return { ledgers };
  }

  /** 가계부 설정 수정 (이름 등). 가계부 번호로 선택 후 설정. 멤버만 가능. */
  @Patch(':ledgerId')
  async update(
    @Param('ledgerId') ledgerId: string,
    @Body() dto: UpdateLedgerDto,
    @CurrentUser() user: User,
  ): Promise<{ ledgerId: string; name: string | null }> {
    return this.ledgerService.updateLedger(user.id, ledgerId, {
      name: dto.name,
    });
  }

  /** 가계부 삭제. 설정 탭에서 가계부 코드(6자리)로 삭제. 멤버만 가능. */
  @Delete(':ledgerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('ledgerId') ledgerId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.ledgerService.deleteLedger(user.id, ledgerId);
  }
}
