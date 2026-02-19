import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

const DEFAULT_JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  sub: string;
  email?: string;
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
}
