import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyCodeDto {
  @IsEmail({}, { message: '올바른 이메일을 입력해 주세요.' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @Length(6, 6, { message: '인증코드는 6자리 숫자예요.' })
  @Matches(/^\d{6}$/, { message: '인증코드는 6자리 숫자예요.' })
  code: string;
}
