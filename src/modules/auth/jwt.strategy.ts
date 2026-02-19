import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import type { JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'fallback-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.authService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없어요.');
    }
    return user;
  }
}
