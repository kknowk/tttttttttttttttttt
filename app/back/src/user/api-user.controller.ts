import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  NotFoundException,
  ParseIntPipe,
  UseInterceptors,
  Body,
  UploadedFiles,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import {
  IUser,
  UserRelationshipKind,
  fromAvatarFileKindToMimeType,
  fromStringToUserRelationshipKind,
} from './user.entity.js';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service.js';
import { join } from 'path';
import { createIRangeRequestWithUserFromURLSearchParams } from '../utility/range-request.js';
import { diskStorage } from 'multer';
import { JwtUpdateInterceptor } from '../auth/jwt.update.interceptor.js';

@UseGuards(AuthGuard('jwt'))
@UseInterceptors(JwtUpdateInterceptor)
@Controller('api/user')
export class ApiUserController {
  constructor(
    configService: ConfigService,
    private userService: UserService,
  ) {
    this.#avatar_path = configService.get('AVATAR_IMAGE_PATH');
  }

  #avatar_path: string;

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

  @Get('avatar/:id')
  async get_avatar(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as IUser;
    if (user.id !== id) {
      const relationship = await this.userService.get_lowest_relationship(
        user.id,
        id,
      );
      if (relationship < UserRelationshipKind.stranger) {
        res.status(403);
        return;
      }
    }
    const avatar_kind = await this.userService.get_avatar_kind(id);
    res.contentType(fromAvatarFileKindToMimeType(avatar_kind));
    res.sendFile(join(this.#avatar_path, id.toString()));
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
    FileFieldsInterceptor(
      [
        {
          name: 'avatar',
          maxCount: 1,
        },
      ],
      {
        storage: diskStorage({
          destination: (req, file, callback) => {
            callback(null, 'static-uploads');
          },
          filename: (req, file, callback) => {
            const user = req.user as IUser;
            const lastIndex = file.originalname.lastIndexOf('.');
            callback(
              null,
              `${user.id}.${file.originalname.slice(lastIndex + 1)}`,
            );
          },
        }),
      },
    ),
  )
  async change_settings(
    @Req() req: Request,
    @Body()
    body: {
      ['user-name']?: string;
      ['user-email']?: string;
      ['user-2fa']?: 'on' | 'off';
    },
    @UploadedFiles() files: Express.Multer.File[] | undefined | null,
  ) {
    const user = req.user as IUser;
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
}
