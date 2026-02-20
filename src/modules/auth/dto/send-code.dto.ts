import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendCodeDto {
  @IsEmail({}, { message: '올바른 이메일을 입력해 주세요.' })
  @IsNotEmpty()
  email: string;
}
