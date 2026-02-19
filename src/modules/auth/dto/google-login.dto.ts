import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsNotEmpty({ message: 'idToken을 보내 주세요.' })
  @IsString()
  idToken: string;
}
