import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { IUser } from '../user/user.entity.js';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';

@Injectable()
export class AuthService {
  #jwtOption: JwtSignOptions;
  constructor(
    private jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.#jwtOption = { secret: configService.get('JWT_SECRET') };
    this.jwt_cookie_options = {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      // !!!milliseconds!!!
      // see: https://expressjs.com/en/4x/api.html#res.cookie
      maxAge: Number.parseInt(configService.get('JWT_EXPIRES_CONSTANT')) * 1000,
      path: '/',
    };
    this.jwt_challenge_cookie_options = structuredClone(this.jwt_cookie_options);
    this.jwt_challenge_cookie_options.maxAge = 5 * 60 * 1000;
  }

  public readonly jwt_cookie_options: CookieOptions;
  public readonly jwt_challenge_cookie_options: CookieOptions;

  async issue_jwt(user: IUser): Promise<string | null> {
    const payload = {
      sub: user.id,
      au: user.is_two_factor_authenticated,
    };
    try {
      const access_token = await this.jwtService.signAsync(payload, this.#jwtOption);
      return access_token;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  clear_jwt(response: Response) {
    response.clearCookie('jwt', this.jwt_cookie_options);
  }

  clear_jwt_challenge(response: Response) {
    response.clearCookie('jwt-challenge', this.jwt_challenge_cookie_options);
  }
}
