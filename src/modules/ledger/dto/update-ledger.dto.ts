import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateLedgerDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '가계부 이름은 100자 이하여야 해요.' })
  name?: string;
}
