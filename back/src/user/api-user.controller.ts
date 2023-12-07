import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  Body,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import {
  IUser,
  UserRelationshipKind,
  fromStringToUserRelationshipKind,
} from './user.entity.js';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service.js';
import { join } from 'path';
import { createIRangeRequestWithUserFromURLSearchParams } from '../utility/range-request.js';
import { JwtUpdateInterceptor } from '../auth/jwt.update.interceptor.js';
import { writeFile } from 'fs/promises';

@UseGuards(AuthGuard('jwt'))
@UseInterceptors(JwtUpdateInterceptor)
@Controller('api/user')
export class ApiUserController {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {}

  @Get('name/:id')
  async get_name(
    @Req() req: Request,
    @Param('id', ParseIntPipe) target_id: number,
  ) {
    const user = req.user as IUser;
    if (target_id === user.id) return user.displayName;
    const target_user = await this.userService.findById(target_id);
    if (target_user == null) throw new NotFoundException();
    const relationship = await this.userService.get_lowest_relationship(
      user.id,
      target_id,
    );
    if (relationship <= UserRelationshipKind.banned)
      throw new NotFoundException();
    return target_user.displayName;
  }

  @Get('user/:id')
  async get_user(
    @Req() req: Request,
    @Param('id', ParseIntPipe) target_id: number,
  ) {
    const user = req.user as IUser;
    if (target_id === user.id) return user;
    const target_user = await this.userService.findById(target_id);
    if (target_user == null) throw new NotFoundException();
    const relationship = await this.userService.get_lowest_relationship(
      user.id,
      target_id,
    );
    if (relationship <= UserRelationshipKind.banned)
      throw new NotFoundException();
    return target_user;
  }

  @Get('find-by-partial-name/:name')
  async find_by_partial_name(@Req() req: Request, @Param('name') name: string) {
    const user = req.user as IUser;
    const url = new URL(req.url, `https://${req.headers.host}`);
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user.id,
      url.searchParams,
      50,
      true,
    );
    const users = await this.userService.find_by_partial_name(
      rangeRequest,
      name,
    );
    return users;
  }

  @Post('set-relationship/:id/:relationship')
  async set_relationship(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('relationship') relationship_text: string,
  ) {
    const relationship = fromStringToUserRelationshipKind(relationship_text);
    if (relationship == null) throw new BadRequestException();
    const user = req.user as IUser;
    if (user.id === id) throw new BadRequestException();
    await this.userService.set_relationship(user.id, id, relationship);
  }

  @Post('get-notice')
  async get_notice(@Req() req: Request) {
    const user = req.user as IUser;
    const url = new URL(req.url, `https://${req.headers.host}`);
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user.id,
      url.searchParams,
      50,
      false,
    );
    rangeRequest.start_exclusive =
      rangeRequest.start_exclusive > user.notice_read_id
        ? rangeRequest.start_exclusive
        : user.notice_read_id;
    const [answer, maxId] = await this.userService.get_notice(rangeRequest);
    if (maxId > user.notice_read_id) {
      user.notice_read_id = maxId;
    }
    return answer;
  }

  @Get('get-notice-count')
  async get_notice_count(@Req() req: Request) {
    const user = req.user as IUser;
    const url = new URL(req.url, `https://${req.headers.host}`);
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user.id,
      url.searchParams,
      50,
      false,
    );
    rangeRequest.start_exclusive =
      rangeRequest.start_exclusive > user.notice_read_id
        ? rangeRequest.start_exclusive
        : user.notice_read_id;
    const answer = await this.userService.get_notice_count(rangeRequest);
    return answer;
  }

  @Post('clear-notice')
  async clear_notice(@Req() req: Request) {
    const user = req.user as IUser;
    await this.userService.clear_notice(user.id);
  }

  @Post('change-settings')
  @UseInterceptors(
    FileInterceptor('user-icon', {
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  async change_settings(
    @Req() req: Request,
    @Body()
    body: {
      ['user-name']?: string;
      ['user-email']?: string;
      ['user-2fa']?: 'on' | 'off';
    },
    @UploadedFile() file: Express.Multer.File | undefined | null,
  ) {
    const user = req.user as IUser;
    if (file != null) {
      if (file.mimetype !== 'image/png') {
        throw new BadRequestException('user-icon must be image/png');
      }
      if (file.size === 0 || file.size > 2 * 1024 * 1024) {
        throw new BadRequestException('user-icon must be in range.');
      }
      if (!(await this.userService.isValidPngFile(file.buffer))) {
        throw new BadRequestException('invalid file');
      }
      try {
        await writeFile(
          join(this.configService.get('ICON_PATH'), `${user.id}.png`),
          file.buffer,
          {
            encoding: 'binary',
          },
        );
      } catch (error) {
        throw new InternalServerErrorException(error);
      }
    }
    const promises = [] as Promise<any>[];
    const name = body['user-name'];
    if (name != null) {
      promises.push(this.userService.set_display_name(user.id, name));
    }
    const email = body['user-email'];
    if (email != null) {
      promises.push(this.userService.set_email(user.id, email));
    }
    const _2fa = body['user-2fa'];
    if (_2fa != null) {
      promises.push(
        this.userService.set_two_factor_authentication_required(
          user.id,
          _2fa === 'on',
        ),
      );
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  @Get('game-result-counts/:user_id')
  async get_game_result_counts(
    @Req() req: Request,
    @Param('id', ParseIntPipe) user_id: number,
  ) {
    const user = req.user as IUser;
    if (!(await this.userService.get_existence(user_id))) {
      throw new NotFoundException();
    }
    const relationship = await this.userService.get_lowest_relationship(
      user.id,
      user_id,
    );
    if (relationship === UserRelationshipKind.banned) {
      throw new UnauthorizedException();
    }
    const result = await this.userService.get_game_result_counts(user_id);
    return result;
  }

  @Get('game-logs/:user_id')
  async get_game_logs(
    @Req() req: Request,
    @Param('id', ParseIntPipe) user_id: number,
  ) {
    const user = req.user as IUser;
    if (!(await this.userService.get_existence(user_id))) {
      throw new NotFoundException();
    }
    const relationship = await this.userService.get_lowest_relationship(
      user.id,
      user_id,
    );
    if (relationship === UserRelationshipKind.banned) {
      throw new UnauthorizedException();
    }
    const url = new URL(req.url, `https://${req.headers.host}`);
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(
      user_id,
      url.searchParams,
      50,
      true,
    );
    const result = await this.userService.get_game_logs(rangeRequest);
    return result;
  }
}
