import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { FIXED_TYPE_EXPENSE, FIXED_TYPE_INCOME } from '../entities/fixed-entry.entity';

export class CreateFixedEntryDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'ledgerId는 6자리 숫자예요.' })
  ledgerId: string;

  @IsIn([FIXED_TYPE_EXPENSE, FIXED_TYPE_INCOME], {
    message: 'type은 expense 또는 income이어야 해요.',
  })
  type: 'expense' | 'income';

  @IsString()
  @MaxLength(100, { message: '제목은 100자 이하여야 해요.' })
  title: string;

  @IsString()
  @MaxLength(100, { message: '카테고리는 100자 이하여야 해요.' })
  category: string;

  @IsNumber()
  @Min(0.01, { message: '금액은 양수여야 해요.' })
  amount: number;

  @IsInt()
  @Min(1, { message: '지출/수입 날짜는 1–31 사이여야 해요.' })
  @Max(31, { message: '지출/수입 날짜는 1–31 사이여야 해요.' })
  dayOfMonth: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}
