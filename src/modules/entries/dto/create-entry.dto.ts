import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  Matches,
  Min,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  LEDGER_ENTRY_TYPE_EXPENSE,
  LEDGER_ENTRY_TYPE_INCOME,
  LEDGER_ENTRY_TYPE_SAVINGS,
} from '../entities/ledger-entry.entity';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateEntryDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'ledgerId는 6자리 숫자예요.' })
  ledgerId: string;

  @IsIn([LEDGER_ENTRY_TYPE_INCOME, LEDGER_ENTRY_TYPE_EXPENSE, LEDGER_ENTRY_TYPE_SAVINGS], {
    message: 'type은 income, expense, savings 중 하나여야 해요.',
  })
  type: 'income' | 'expense' | 'savings';

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '카테고리는 100자 이하여야 해요.' })
  @ValidateIf((o) => o.type === LEDGER_ENTRY_TYPE_SAVINGS)
  @IsNotEmpty({ message: '저축일 때는 카테고리를 선택해 주세요.' })
  category?: string;

  @IsNumber()
  @Min(0.01, { message: 'amount는 양수여야 해요.' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'title을 입력해 주세요.' })
  title: string;

  @Matches(DATE_PATTERN, { message: 'date는 YYYY-MM-DD 형식이어야 해요.' })
  date: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
