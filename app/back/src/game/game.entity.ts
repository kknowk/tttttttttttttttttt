import { Column, Entity, PrimaryGeneratedColumn, } from "typeorm";

@Entity()
export class GameLog {
	@PrimaryGeneratedColumn({
		type: 'int'
	})
	id: number;

	@Column()
	winner_id: string;

	@Column()
	loser_id: string;

	@Column({
		type: 'int8',
		comment: 'utc seconds'
	})
	date: number;
}
