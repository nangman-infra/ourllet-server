import { IsString, Matches, Length } from 'class-validator';

export class JoinLedgerDto {
  @IsString()
  @Length(6, 6, { message: '초대코드는 6자리 숫자예요.' })
  @Matches(/^\d{6}$/, { message: '초대코드는 6자리 숫자예요.' })
  code: string;
}
