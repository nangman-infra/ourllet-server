import { Controller, Post, Get, Body, UseGuards, Req, Res, Query } from '@nestjs/common';
import { Response, Request } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from './entities/user.entity';
import { CurrentUser } from './current-user.decorator';

const OAUTH_STATE_COOKIE = 'oauth_state';
const STATE_COOKIE_MAX_AGE_MS = 600_000; // 10 min

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** OAuth 진입: state 쿠키 설정 후 Google 인증 URL로 리다이렉트 */
  @Get('google')
  async googleOAuthStart(@Req() req: Request, @Res() res: Response): Promise<void> {
    const backendBaseUrl = process.env.BACKEND_APP_URL ?? `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${backendBaseUrl}/api/v1/auth/callback/google`;
    const state = randomBytes(32).toString('hex');

    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: STATE_COOKIE_MAX_AGE_MS,
      path: '/',
    });

    const authUrl = this.authService.getGoogleAuthUrl(redirectUri, state);
    res.redirect(302, authUrl);
  }

  /** OAuth 콜백: code·state 검증 후 JWT 발급, 프론트 로그인 페이지로 리다이렉트 */
  @Get('callback/google')
  async googleOAuthCallback(
    @Query('code') code: string | undefined,
    @Query('state') stateFromQuery: string | undefined,
    @Query('error') errorFromGoogle: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = (process.env.FRONTEND_APP_URL ?? '').replace(/\/$/, '');
    const loginUrl = frontendUrl ? `${frontendUrl}/login` : '/login';

    const redirectToFrontend = (hashOrQuery: string) => {
      if (hashOrQuery.startsWith('#')) {
        res.redirect(302, `${loginUrl}${hashOrQuery}`);
      } else {
        const q = hashOrQuery.startsWith('?') ? hashOrQuery : `?${hashOrQuery}`;
        res.redirect(302, `${loginUrl}${q}`);
      }
    };

    if (errorFromGoogle) {
      redirectToFrontend(`?error=google_${errorFromGoogle}`);
      return;
    }

    const stateFromCookie = req.cookies?.[OAUTH_STATE_COOKIE];
    if (!stateFromQuery || !stateFromCookie || stateFromQuery !== stateFromCookie) {
      redirectToFrontend('?error=invalid_state');
      return;
    }

    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

    if (!code) {
      redirectToFrontend('?error=no_code');
      return;
    }

    const backendBaseUrl = process.env.BACKEND_APP_URL ?? `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${backendBaseUrl}/api/v1/auth/callback/google`;

    try {
      const idToken = await this.authService.exchangeCodeForIdToken(code, redirectUri);
      const payload = await this.authService.verifyGoogleIdToken(idToken);
      const user = await this.authService.findOrCreateUser(payload);
      const token = await this.authService.issueJwt(user);
      redirectToFrontend(`#token=${encodeURIComponent(token)}`);
    } catch {
      redirectToFrontend('?error=backend_auth');
    }
  }

  /** idToken 직접 전달 (POST) — One Tap/팝업 로그인 시 사용. GET(리다이렉트)와 별도 라우트 */
  @Post('google')
  async googleLogin(@Body() dto: GoogleLoginDto): Promise<{
    token: string;
    user: { id: string; email: string; name?: string; picture?: string };
  }> {
    const payload = await this.authService.verifyGoogleIdToken(dto.idToken);
    const user = await this.authService.findOrCreateUser(payload);
    const token = await this.authService.issueJwt(user);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        picture: user.picture ?? undefined,
      },
    };
  }

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
