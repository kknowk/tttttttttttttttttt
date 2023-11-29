import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user/user.service.js';
import { IUser } from '../user/user.entity.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          const jwt = req?.cookies?.jwt;
          if (!jwt) {
            console.log('not found jwt' + req.headers.from);
          }
          return jwt;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: number; au: boolean }) {
    const user: IUser = await this.userService.findById(payload.sub);
    if (user == null) return null;
    await this.userService.update_user_activity(user.id);
    user.is_two_factor_authenticated = false;
    if (user.two_factor_authentication_required && payload.au) {
      user.is_two_factor_authenticated = true;
    }
    return user;
  }
}
