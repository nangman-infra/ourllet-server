import { Controller, Get, Query } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { SummaryQueryDto } from './dto/summary-query.dto';

@Controller('v1/summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  async getSummary(
    @Query() query: SummaryQueryDto,
  ): Promise<{
    totalIncome: number;
    totalExpense: number;
    balance: number;
    period: string;
  }> {
    return this.summaryService.getSummaryByPeriod(query.period);
  }
}
