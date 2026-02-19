import { IsNotEmpty, Matches } from 'class-validator';

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

export class SummaryQueryDto {
  @IsNotEmpty({ message: 'ledgerId(6자리)를 입력해 주세요.' })
  @Matches(/^\d{6}$/, { message: 'ledgerId는 6자리 숫자예요.' })
  ledgerId: string;

  @IsNotEmpty({ message: 'period(YYYY-MM)를 입력해 주세요.' })
  @Matches(PERIOD_PATTERN, { message: 'period는 YYYY-MM 형식이어야 해요.' })
  period: string;
}
