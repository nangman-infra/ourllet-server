import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  ArrayMaxSize,
  Matches,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class UpdateFixedEntryDto {
  @IsOptional()
  @IsIn(['expense', 'income'])
  type?: 'expense' | 'income';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true, message: 'excludedDates 요소는 YYYY-MM-DD 형식이어야 해요.' })
  @ArrayMaxSize(366, { message: 'excludedDates는 366개 이하여야 해요.' })
  excludedDates?: string[];
}
