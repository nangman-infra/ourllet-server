import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@Controller('v1/summary')
@UseGuards(JwtAuthGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  async getSummary(
    @Query() query: SummaryQueryDto,
    @CurrentUser() user: User,
  ): Promise<{
    totalIncome: number;
    totalExpense: number;
    totalSavings: number;
    balance: number;
    period: string;
  }> {
    return this.summaryService.getSummaryByPeriod(query.period, user.id, query.ledgerId);
  }
}
