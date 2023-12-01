import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export const UserActivityKind = {
  logout: 0,
  login: 1,
  in_game: 2,
} as const;
export type UserActivityKind =
  (typeof UserActivityKind)[keyof typeof UserActivityKind];

@Entity()
export class User {
  @PrimaryGeneratedColumn({
    type: 'int',
  })
  id: number;

  @Column({
    unique: true,
    type: 'varchar',
    collation: 'C',
  })
  displayName: string;

  @Column({
    type: 'int8',
    comment: 'UTC seconds',
  })
  last_activity_timestamp: number;

  @Column({
    type: 'int',
    default: 0,
  })
  activity_kind: UserActivityKind;

  @Column({
    type: 'boolean',
    default: 'FALSE',
  })
  two_factor_authentication_required: boolean;

  @Column({
    type: 'int8',
    default: -1,
  })
  notice_read_id: number;

  to_interface() {
    return {
      id: this.id,
      displayName: this.displayName,
      last_activity_timestamp: this.last_activity_timestamp,
      activity_kind: this.activity_kind,
      two_factor_authentication_required:
        this.two_factor_authentication_required,
      is_two_factor_authenticated: false,
      notice_read_id: this.notice_read_id,
    };
  }
}

type _IUser = {
  [K in keyof Omit<User, 'to_interface'>]: User[K];
};

export interface IUser extends _IUser {
  is_two_factor_authenticated: boolean;
}

@Entity()
export class User42Cross {
  @PrimaryColumn({
    type: 'varchar',
    collation: 'C',
  })
  id_42: string;

  @OneToOne(() => User, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'id',
    referencedColumnName: 'id',
  })
  private _id: never;

  @Column({
    type: 'int',
    unique: true,
  })
  id: number;
}

export const UserRelationshipKind = {
  stranger: 0,
  friend: 1,
  banned: -1,
} as const;
export type UserRelationshipKind =
  (typeof UserRelationshipKind)[keyof typeof UserRelationshipKind];

export function fromStringToUserRelationshipKind(
  value: string,
): UserRelationshipKind | null {
  switch (value) {
    case 'stranger':
      return UserRelationshipKind.stranger;
    case 'friend':
      return UserRelationshipKind.friend;
    case 'banned':
      return UserRelationshipKind.banned;
    default:
      const parsed = Number.parseInt(value);
      if (Number.isNaN(parsed) || parsed < -1 || parsed > 1) return null;
      return parsed as UserRelationshipKind;
  }
}

@Unique(['from_id', 'to_id'])
@Entity()
export class UserRelationship {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'from_id',
    referencedColumnName: 'id',
  })
  private _from_id: never;

  @Column()
  from_id: number;

  @ManyToOne(() => User, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'to_id',
    referencedColumnName: 'id',
  })
  private _to_id: never;

  @Column()
  to_id: number;

  @Column({
    type: 'int',
    default: UserRelationshipKind.stranger,
  })
  relationship: UserRelationshipKind;
}

export const UserAvatarFileKind = {
  jpeg: 0,
  jpegxl: 1,
  png: 2,
} as const;
export type UserAvatarFileKind =
  (typeof UserAvatarFileKind)[keyof typeof UserAvatarFileKind];

export function fromMimeTypeToUserAvatarFileKind(
  type?: string,
): UserAvatarFileKind | null {
  switch (type) {
    case 'image/jxl':
      return UserAvatarFileKind.png;
    case 'image/jpeg':
      return UserAvatarFileKind.jpeg;
    case 'image/png':
      return UserAvatarFileKind.png;
    default:
      return null;
  }
}

export function fromAvatarFileKindToMimeType(
  kind?: UserAvatarFileKind,
): string | null {
  switch (kind) {
    case UserAvatarFileKind.jpeg:
      return 'image/jpeg';
    case UserAvatarFileKind.jpegxl:
      return 'image/jxl';
    case UserAvatarFileKind.png:
      return 'image/png';
    default:
      return null;
  }
}

@Entity()
export class UserDetailInfo {
  @PrimaryColumn()
  id: number;

  @OneToOne(() => User, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'id',
    referencedColumnName: 'id',
  })
  private _id: never;

  @Column({
    type: 'varchar',
  })
  email: string;

  @Column({
    type: 'int',
    default: 0,
  })
  avatar_kind: UserAvatarFileKind;
}

export type IUserWithRelationship = {
  relationship: UserRelationshipKind;
} & {
  [K in keyof Omit<
    IUser,
    | 'last_activity_timestamp'
    | 'activity_kind'
    | 'two_factor_authentication_required'
    | 'is_two_factor_authenticated'
    | 'notice_read_id'
  >]: IUser[K];
};

@Entity()
export class Notice {
  @PrimaryColumn()
  id: number;

  @OneToOne(() => User, { nullable: false, cascade: ['remove'] })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  private _user_id: never;

  @Column({
    type: 'int',
    default: 0,
  })
  user_id: number;

  @Column({
    type: 'varchar',
    default: '',
  })
  content: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'utc seconds'
  })
  date: number;
}

export type INotice = {
  [K in keyof Notice]: Notice[K];
};
