import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../auth/entities/user.entity';

const LEDGER_ID_PATTERN = /^\d{6}$/;
const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

@Controller('v1/settlement')
@UseGuards(JwtAuthGuard)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  /** 월간 지출 항목별 집계 (결산 탭 파이차트용). 제목(title)으로 그룹, 금액 내림차순 */
  @Get()
  async getExpenseBreakdown(
    @Query('ledgerId') ledgerId: string,
    @Query('period') period: string,
    @CurrentUser() user: User,
  ): Promise<{ period: string; items: { title: string; amount: number }[] }> {
    if (!ledgerId || !LEDGER_ID_PATTERN.test(ledgerId)) {
      throw new BadRequestException('ledgerId는 6자리 숫자예요.');
    }
    if (!period || !PERIOD_PATTERN.test(period)) {
      throw new BadRequestException('period는 YYYY-MM 형식이어야 해요.');
    }
    return this.settlementService.getExpenseBreakdown(period, user.id, ledgerId);
  }
}
