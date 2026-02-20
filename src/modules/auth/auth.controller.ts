import { Controller, Post, Get, Body, UseGuards, Req, Res, Query } from '@nestjs/common';
import { Response, Request } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from './entities/user.entity';
import { CurrentUser } from './current-user.decorator';

const OAUTH_STATE_COOKIE = 'oauth_state';
const STATE_COOKIE_MAX_AGE_MS = 600_000; // 10 min

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ----- 이메일 인증코드 로그인/회원가입 -----

  /** 이메일로 6자리 인증코드 전송 */
  @Post('send-code')
  async sendCode(@Body() dto: SendCodeDto): Promise<{ ok: true }> {
    await this.authService.sendVerificationCode(dto.email);
    return { ok: true };
  }

  /** 인증코드 검증. 기존 사용자면 로그인, 신규면 signupToken 반환 */
  @Post('verify')
  async verify(
    @Body() dto: VerifyCodeDto,
  ): Promise<
    | { needSignup: false; token: string; user: { id: string; email: string; name?: string } }
    | { needSignup: true; signupToken: string }
  > {
    return this.authService.verifyCode(dto.email, dto.code);
  }

  /** 회원가입: signupToken + 닉네임 + 최초 가계부 이름 */
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{
    token: string;
    user: { id: string; email: string; name?: string };
  }> {
    return this.authService.register(dto.signupToken, dto.nickname, dto.ledgerName);
  }

  // ----- Google OAuth (잠시 비활성) -----
  // @Get('google')
  // async googleOAuthStart(@Req() req: Request, @Res() res: Response): Promise<void> { ... }

  // @Get('callback/google')
  // async googleOAuthCallback(...): Promise<void> { ... }

  // @Post('google')
  // async googleLogin(@Body() dto: GoogleLoginDto) { ... }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User): Promise<{
    id: string;
    email: string;
    name?: string;
    picture?: string;
  }> {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      picture: user.picture ?? undefined,
    };
  }
}
