import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'signupToken이 필요해요.' })
  signupToken: string;

  @IsString()
  @MaxLength(50, { message: '닉네임은 50자 이하여야 해요.' })
  nickname: string;

  @IsString()
  @IsNotEmpty({ message: '가계부 이름을 입력해 주세요.' })
  @MaxLength(100, { message: '가계부 이름은 100자 이하여야 해요.' })
  ledgerName: string;
}
