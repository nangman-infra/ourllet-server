import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from './entities/user.entity';
import { CurrentUser } from './current-user.decorator';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
