import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { MailerService } from './mailer.service';
import { LedgerService } from '../ledger/ledger.service';
import * as emailVerification from './email-verification.store';

const DEFAULT_JWT_EXPIRES_IN = '7d';
const SIGNUP_TOKEN_EXPIRES_IN = '5m';

export interface JwtPayload {
  sub: string;
  email?: string;
}

export interface SignupTokenPayload {
  purpose: 'signup';
  email: string;
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_SCOPES = ['openid', 'email', 'profile'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly ledgerService: LedgerService,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
    this.googleClient = new OAuth2Client(clientId, clientSecret);
  }

  /** OAuth 진입: state 생성 후 사용할 Google 인증 URL 반환 */
  getGoogleAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: OAUTH_SCOPES.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /** authorization code로 id_token 교환 */
  async exchangeCodeForIdToken(code: string, redirectUri: string): Promise<string> {
    const { tokens } = await this.googleClient.getToken({ code, redirect_uri: redirectUri });
    const idToken = tokens.id_token;
    if (!idToken) {
      throw new UnauthorizedException('Google에서 토큰을 받지 못했어요.');
    }
    return idToken;
  }

  async verifyGoogleIdToken(idToken: string): Promise<{
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  }> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Google 토큰 검증에 실패했어요.');
      }
      return {
        sub: payload.sub,
        email: payload.email ?? undefined,
        name: payload.name ?? undefined,
        picture: payload.picture ?? undefined,
      };
    } catch (err) {
      this.logger.warn('Google id_token 검증 실패', err instanceof Error ? err.message : String(err));
      throw new UnauthorizedException('Google 토큰 검증에 실패했어요.');
    }
  }

  async findOrCreateUser(googlePayload: {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  }): Promise<User> {
    let user = await this.userRepo.findOne({
      where: { googleSub: googlePayload.sub },
    });
    if (user) {
      user.email = googlePayload.email ?? user.email;
      user.name = googlePayload.name ?? user.name;
      user.picture = googlePayload.picture ?? user.picture;
      return this.userRepo.save(user);
    }
    user = this.userRepo.create({
      id: uuidv4(),
      googleSub: googlePayload.sub,
      email: googlePayload.email ?? '',
      name: googlePayload.name ?? null,
      picture: googlePayload.picture ?? null,
    });
    return this.userRepo.save(user);
  }

  async issueJwt(user: User): Promise<string> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const expiresIn = process.env.JWT_EXPIRES_IN ?? DEFAULT_JWT_EXPIRES_IN;
    return this.jwtService.signAsync(payload, { expiresIn });
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    return this.userRepo.findOne({ where: { email: normalized } });
  }

  /** 이메일로 6자리 인증코드 전송 */
  async sendVerificationCode(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException('올바른 이메일을 입력해 주세요.');
    }
    const code = String(Math.floor(100_000 + Math.random() * 900_000));
    emailVerification.setCode(normalized, code);
    await this.mailerService.sendVerificationCode(normalized, code);
  }

  /** 인증코드 검증. 기존 사용자면 로그인(JWT), 신규면 회원가입용 signupToken 반환 */
  async verifyCode(
    email: string,
    code: string,
  ): Promise<
    | { needSignup: false; token: string; user: { id: string; email: string; name?: string } }
    | { needSignup: true; signupToken: string }
  > {
    const normalized = email.trim().toLowerCase();
    const stored = emailVerification.getAndConsumeCode(normalized);
    if (!stored || stored !== code.trim()) {
      throw new UnauthorizedException('인증코드가 맞지 않거나 만료됐어요.');
    }
    const user = await this.findByEmail(normalized);
    if (user) {
      const token = await this.issueJwt(user);
      return {
        needSignup: false,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        },
      };
    }
    const signupToken = await this.jwtService.signAsync(
      { purpose: 'signup', email: normalized } as SignupTokenPayload,
      { expiresIn: SIGNUP_TOKEN_EXPIRES_IN },
    );
    return { needSignup: true, signupToken };
  }

  /** 회원가입: signupToken + 닉네임 + 최초 가계부 이름. 가계부 생성 후 JWT 반환 */
  async register(
    signupToken: string,
    nickname: string,
    ledgerName: string,
  ): Promise<{
    token: string;
    user: { id: string; email: string; name?: string };
  }> {
    let payload: SignupTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync(signupToken);
    } catch {
      throw new UnauthorizedException('회원가입 유효 시간이 지났어요. 인증코드를 다시 받아 주세요.');
    }
    if (payload.purpose !== 'signup' || !payload.email) {
      throw new UnauthorizedException('잘못된 요청이에요.');
    }
    const email = payload.email.trim().toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new BadRequestException('이미 가입된 이메일이에요. 로그인해 주세요.');
    }
    const name = nickname?.trim() || null;
    const userId = uuidv4();
    const user = this.userRepo.create({
      id: userId,
      googleSub: null,
      email,
      name,
      picture: null,
    });
    await this.userRepo.save(user);
    await this.ledgerService.createLedgerWithName(userId, ledgerName?.trim() || '내 가계부');
    const token = await this.issueJwt(user);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
      },
    };
  }
}
