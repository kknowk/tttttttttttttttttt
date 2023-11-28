import { Injectable } from '@nestjs/common';
import {
  IUser,
  User,
  User42Cross,
  UserDetailInfo,
  UserRelationship,
  UserRelationshipKind,
  IUserWithRelationship,
  UserActivityKind,
  fromMimeTypeToUserAvatarFileKind,
  UserAvatarFileKind,
} from './user.entity.js';
import { InsertResult, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GameLog } from '../game/game.entity.js';
import * as address from 'email-addresses';
import { fileTypeFromBlob } from 'file-type';
import { ConfigService } from '@nestjs/config';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { IRangeRequestWithUserId, addOrderAndLimit, addWhereCondition } from '../utility/range-request.js';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(User42Cross)
    private user42CrossRepository: Repository<User42Cross>,
    @InjectRepository(UserRelationship)
    private userRelationshipRepository: Repository<UserRelationship>,
    @InjectRepository(UserDetailInfo)
    private userDetailInfoRepository: Repository<UserDetailInfo>,
    @InjectRepository(GameLog) private gameLogRepository: Repository<GameLog>,
    configService: ConfigService,
  ) {
    this.#image_path = configService.get('AVATAR_IMAGE_PATH');
  }

  #calc_time = () => {
    return Math.floor(Date.now() / 1000);
  };

  #image_path: string;

  public async findOrCreate(id_42: string, loginName: string, email: string): Promise<User> {
    const found_user_id = await this.user42CrossRepository.findOneBy({
      id_42: id_42,
    });
    if (found_user_id != null) {
      const found_user = await this.userRepository.findOneBy({
        id: found_user_id.id,
      });
      return found_user;
    }
    const tmpUser = new User();
    tmpUser.last_activity_timestamp = this.#calc_time();
    tmpUser.displayName = await this.#get_displayable_name(loginName);
    const user = await this.userRepository.save(tmpUser);
    await this.user42CrossRepository.save({ id_42: id_42, id: user.id });
    await this.userDetailInfoRepository.save({ id: user.id, email });
    return user;
  }

  public async test_find_or_create(id: number, displayName: string): Promise<IUser> {
    const found_user = await this.userRepository.findOneBy({ id: id });
    if (found_user) {
      return found_user.to_interface();
    }
    const tmpUser = new User();
    tmpUser.last_activity_timestamp = this.#calc_time();
    tmpUser.activity_kind = UserActivityKind.login;
    tmpUser.displayName = await this.#get_displayable_name(displayName);
    const user = await this.userRepository.save(tmpUser);
    return user.to_interface();
  }

  async #get_displayable_name(name: string): Promise<string> {
    let index: number = -1;
    const original_name = name;
    while (
      await this.userRepository.exist({
        where: {
          displayName: name,
        },
      })
    ) {
      name = original_name + '_' + (++index).toString();
      console.log(name);
    }
    return name;
  }

  public async update_user_activity(id: number, kind?: UserActivityKind): Promise<void> {
    const time = this.#calc_time();
    if (kind == null) {
      await this.userRepository.update({ id: id }, { last_activity_timestamp: time });
    } else {
      await this.userRepository.update({ id: id }, { last_activity_timestamp: time, activity_kind: kind });
    }
  }

  public async get_friends(request: IRangeRequestWithUserId): Promise<Omit<IUser, 'two_factor_authentication_required' | 'is_two_factor_authenticated'>[]> {
    /*
		WITH "friends"("id") AS (SELECT "to_id" FROM "UserRelationship" WHERE "from_id"=$id AND "relationship"=1)
		SELECT * FROM "User" AS "u" INNER JOIN "friends" AS "f" ON "u"."id"="f"."id";
		*/
    const query = this.userRelationshipRepository
      .createQueryBuilder()
      .select('to_id')
      .distinctOn(['to_id'])
      .where('from_id=:id', { id: request.user_id })
      .andWhere('relationship=1');
    const userQuery = this.userRepository
      .createQueryBuilder('u')
      .addCommonTableExpression(query, 'friends', { columnNames: ['id'] })
      .select('u.id', 'id')
      .addSelect('u.displayName', 'displayName')
      .addSelect('u.last_activity_timestamp', 'last_activity_timestamp')
      .addSelect('u.activity_kind', 'activity_kind')
      .distinctOn(['u.id'])
      .innerJoin('friends', 'f', 'u.id=f.id');
    const users = await userQuery.getRawMany();
    return users;
  }

  public async findById(id: number, update_activity?: true): Promise<IUser | null> {
    if (update_activity) {
      this.userRepository.createQueryBuilder().update({
        last_activity_timestamp: this.#calc_time(),
        activity_kind: () => 'CASE WHEN "activity_kind" > 1 THEN "activity_kind" ELSE 1 END',
      });
    }
    const user = await this.userRepository.findOneBy({ id });
    return user?.to_interface();
  }

  public async get_lowest_relationship(id0: number, id1: number): Promise<UserRelationshipKind> {
    const literal = await this.userRelationshipRepository
      .createQueryBuilder()
      .select('MIN(relationship)', 'value')
      .where('(from_id=:id0 AND to_id=:id1) OR (from_id=:id1 AND to_id=:id0)', {
        id0,
        id1,
      })
      .getRawOne();
    return literal?.value ?? UserRelationshipKind.stranger;
  }

  public async set_relationship(requester_id: number, target_id: number, relationship: UserRelationshipKind) {
    const result: InsertResult = await this.userRelationshipRepository.upsert(
      {
        from_id: requester_id,
        to_id: target_id,
        relationship: relationship,
      },
      {
        upsertType: 'on-conflict-do-update',
        skipUpdateIfNoValuesChanged: true,
        conflictPaths: {
          from_id: true,
          to_id: true,
        },
      },
    );
  }

  public async set_two_factor_authentication_required(user_id: number, two_factor_authentication_required: boolean) {
    await this.userRepository.update(
      {
        id: user_id,
      },
      {
        two_factor_authentication_required: two_factor_authentication_required,
        last_activity_timestamp: this.#calc_time(),
      },
    );
  }

  public async set_display_name(user_id: number, name: string) {
    if (name.length === 0 || name.length > 16) return;
    const result = (
      await this.userRepository
        .createQueryBuilder()
        .update()
        .set({
          displayName: name,
          last_activity_timestamp: this.#calc_time(),
        })
        .where('id=:id', { id: user_id })
        .returning('displayName')
        .execute()
    ).generatedMaps;
  }

  public async get_email(user_id: number) {
    const email = (await this.userDetailInfoRepository.createQueryBuilder().select('email').where('id=:user_id', { user_id }).getRawOne())?.email;
    if (typeof email !== 'string') return null;
    return email;
  }

  public async set_email(user_id: number, email: string) {
    const result = address.default.parseOneAddress(email);
    if (result == null) return 0;
    const exe_result = await this.userDetailInfoRepository
      .createQueryBuilder()
      .update()
      .set({ email })
      .where('id=:id', { id: user_id })
      .returning('id')
      .execute();
    return exe_result.generatedMaps.length;
  }

  public async set_avatar(user_id: number, blob: Blob) {
    if (blob.size > 1024 * 1024) return false;
    const kind = fromMimeTypeToUserAvatarFileKind((await fileTypeFromBlob(blob)).mime);
    if (kind == null) return false;
    const path = join(this.#image_path, user_id.toString());
    const buffer = Buffer.from(await blob.arrayBuffer());
    try {
      await writeFile(path, buffer);
    } catch {
      return false;
    }
    return true;
  }

  public async get_avatar_kind(user_id: number) {
    const one = await this.userDetailInfoRepository.createQueryBuilder().select('avatar_kind').where('id=:id', { id: user_id }).getRawOne();
    return one?.avatar_kind as UserAvatarFileKind | null;
  }

  public async find_by_partial_name(request: IRangeRequestWithUserId, name: string): Promise<IUserWithRelationship[]> {
    /*
		SELECT * FROM "User" LEFT JOIN "UserRelationship" ON "User"."Id" = "UserRelationship"."to_id" AND "UserRelationship"."to_id"
			WHERE "u.displayName" LIKE "%:name%";
		*/
    let query = this.userRepository
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .addSelect('u.displayName', 'displayName')
      .addSelect('COALESCE(ur.ur_relationship, 0)', 'relationship')
      .distinctOn(['u.id'])
      .leftJoin(
        (qb) => qb.select(['ur.relationship', 'ur.to_id', 'ur.from_id']).from(UserRelationship, 'ur'),
        'ur',
        'ur.ur_to_id=u.id AND ur.ur_from_id=:user_id',
        { user_id: request.user_id },
      )
      .where("u.displayName LIKE ('%' || :name || '%')", { name });
    query = addWhereCondition(request, query, 'u.id', true);
    query = addOrderAndLimit(request, query, 'u.id');
    return await query.getRawMany();
  }

  public async get_existence(user_id: number) {
    return await this.userRepository.exist({ where: { id: user_id } });
  }

  public async get_users(requester_id: number, user_ids: number[]): Promise<IUserWithRelationship[]> {
    const query = this.userRepository
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .addSelect('u.displayName', 'displayName')
      .addSelect('COALESCE(ur.ur_relationship, 0)', 'relationship')
      .distinctOn(['u.id'])
      .leftJoin(
        (qb) => qb.select(['ur.relationship', 'ur.to_id', 'ur.from_id']).from(UserRelationship, 'ur'),
        'ur',
        'ur.ur_to_id=u.id AND ur.ur_from_id=:user_id',
        { user_id: requester_id },
      )
      .where('1')
      .whereInIds(user_ids);
    const result = await query.getRawMany();
    return result;
  }
}
