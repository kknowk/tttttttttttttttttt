import { BadRequestException, Controller, Get, Param, Post, Req, Res, UseGuards, NotFoundException, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { IUser, UserRelationshipKind, fromAvatarFileKindToMimeType, fromStringToUserRelationshipKind } from './user.entity.js';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service.js';
import { join } from 'path';
import { createIRangeRequestWithUserFromURLSearchParams } from '../utility/range-request.js';

@UseGuards(AuthGuard('jwt'))
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
  async get_name(@Req() req: Request, @Param('id', ParseIntPipe) target_id: number) {
    const user = req.user as IUser;
    if (target_id === user.id) return user.displayName;
    const target_user = await this.userService.findById(target_id);
    if (target_user == null) throw new NotFoundException();
    const relationship = await this.userService.get_lowest_relationship(user.id, target_id);
    if (relationship <= UserRelationshipKind.banned) throw new NotFoundException();
    return target_user.displayName;
  }

  @Get('user/:id')
  async get_user(@Req() req: Request, @Param('id', ParseIntPipe) target_id: number) {
    const user = req.user as IUser;
    if (target_id === user.id) return user;
    const target_user = await this.userService.findById(target_id);
    if (target_user == null) throw new NotFoundException();
    const relationship = await this.userService.get_lowest_relationship(user.id, target_id);
    if (relationship <= UserRelationshipKind.banned) throw new NotFoundException();
    return target_user;
  }

  @Get('avatar/:id')
  async get_avatar(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Res({ passthrough: true }) res: Response) {
    const user = req.user as IUser;
    if (user.id !== id) {
      const relationship = await this.userService.get_lowest_relationship(user.id, id);
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
    const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(user.id, url.searchParams, 50, true);
    const users = await this.userService.find_by_partial_name(rangeRequest, name);
    return users;
  }

  @Post('set-relationship/:id/:relationship')
  async set_relationship(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('relationship') relationship_text: string) {
    const relationship = fromStringToUserRelationshipKind(relationship_text);
    if (relationship == null) throw new BadRequestException();
    const user = req.user as IUser;
    if (user.id === id) throw new BadRequestException();
    await this.userService.set_relationship(user.id, id, relationship);
  }
}
