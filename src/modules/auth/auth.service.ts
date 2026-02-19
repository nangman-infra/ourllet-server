import { Injectable, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
    this.googleClient = new OAuth2Client(clientId);
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
    } catch {
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
