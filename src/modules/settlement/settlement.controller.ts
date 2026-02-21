import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { SettlementService, SettlementItem } from './settlement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../auth/entities/user.entity';

const LEDGER_ID_PATTERN = /^\d{6}$/;
const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

@Controller('v1/settlement')
@UseGuards(JwtAuthGuard)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  /** 월간 결산: totalIncome(100%) + items(고정비/저축/지출 카테고리별). 파이차트용. ?debug=1 시 _debug 필드로 집계 내역 반환 */
  @Get()
  async getSettlement(
    @Query('ledgerId') ledgerId: string,
    @Query('period') period: string,
    @Query('debug') debug: string | undefined,
    @CurrentUser() user: User,
  ): Promise<{
    period: string;
    totalIncome: number;
    items: SettlementItem[];
    _debug?: {
      dateRange: { start: string; end: string };
      incomeFromEntries: number;
      fixedIncomeSum: number;
      totalIncome: number;
      incomeEntries: { id: string; date: string; amount: number }[];
    };
  }> {
    if (!ledgerId || !LEDGER_ID_PATTERN.test(ledgerId)) {
      throw new BadRequestException('ledgerId는 6자리 숫자예요.');
    }
    if (!period || !PERIOD_PATTERN.test(period)) {
      throw new BadRequestException('period는 YYYY-MM 형식이어야 해요.');
    }
    return this.settlementService.getSettlement(period, user.id, ledgerId, {
      debug: debug === '1' || debug === 'true',
    });
  }
}
