import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { GameMatchingRequest } from './game-matching.entity.js';

@Injectable()
export class GameMatchingService {
    constructor(
        @InjectRepository(GameMatchingRequest)
        private gameMatchingRequestRepository: Repository<GameMatchingRequest>,
    ) { }

    // 変更
    private lastGameRoomId = 0;

    private generateGameRoomId(): string {
        this.lastGameRoomId += 1;
        return this.lastGameRoomId.toString();
    }

    async startMatchmaking(playerId: number) {
        // マッチを探す
        const existingMatch = await this.findMatch(playerId);
        const gameRoomId = existingMatch ? existingMatch.gameRoomId : this.generateGameRoomId();
        const now = new Date().getTime();
        
        // 新しいマッチングリクエストを作成
        const request = this.gameMatchingRequestRepository.create({
            requester_id: playerId,
            creation_time: now,
            status: 'waiting',
            gameRoomId
        });
    
        // データベースに保存
        await this.gameMatchingRequestRepository.save(request);
    
        // マッチが見つかった場合の処理
        if (existingMatch) {
            // 既存のマッチングリクエストのステータスを更新
            await this.gameMatchingRequestRepository.update({ id: existingMatch.id }, { status: 'matched' });
            await this.gameMatchingRequestRepository.update({ id: playerId }, { status: 'matched' });
            return { success: true, match: existingMatch, gameRoomId };
        }
    
        // 新しいマッチを探す
        let match = null;
        while (!match) {
            match = await this.findMatch(playerId);
        }
    
        // マッチが見つかった場合の処理
        return { success: true, match, gameRoomId };
    }

        private async findMatch(playerId: number) {
        // ステータスが 'waiting' のリクエストを検索
        const match = await this.gameMatchingRequestRepository.findOne({
            where: {
                requester_id: Not(playerId),
                status: 'waiting'
            },
            order: {
                creation_time: 'ASC'
            }
        });

        // // デバッグ用のコンソールログ
        // console.log(`Match found: ${JSON.stringify(match)}`);
        // console.log(`検索結果: ${match ? JSON.stringify(match) : '該当なし'}`); // 検索結果をログ出力

        if (match) {
            // 両プレイヤーのステータスを 'matched' に更新
            await this.gameMatchingRequestRepository.update({ id: match.id }, { status: 'matched' });
            await this.gameMatchingRequestRepository.update({ id: playerId }, { status: 'matched' });
            console.log(`Match`);
            return match;
        }

        return null;
    }
    

    // async startMatchmaking(playerId: number) {
    //     // プレイヤーをキューに追加
    //     const existingMatch = await this.findMatch(playerId);
    //     const gameRoomId = existingMatch ? existingMatch.gameRoomId : this.generateGameRoomId();
    //     const now = new Date().getTime();
    //     const request = this.gameMatchingRequestRepository.create({
    //         requester_id: playerId,
    //         creation_time: now,
    //         status: 'waiting',
    //         // 変更
    //         gameRoomId // 生成したゲームルームIDを追加
    //     });
    //     console.log(`リクエストをデータベースに保存: ${JSON.stringify(request)}`); // 保存したリクエストをログ出力
    //     await this.gameMatchingRequestRepository.save(request);

    //     // マッチを探す
    //     let match = null;
    //     console.log(`マッチを探す: ${match ? JSON.stringify(match) : '見つからない'}`); // マッチの状況をログ出力
    //     while (!match) {
    //         match = await this.findMatch(playerId);
    //         // if (!match) {
    //         //     await new Promise(resolve => setTimeout(resolve, 5000));
    //         // }
    //     }

    //     console.log(`マッチが見つかった: ${JSON.stringify(match)}`); // 見つかったマッチをログ出力
    //     // マッチが見つかった場合の処理
    //     // 変更
    //     return { success: true, match , gameRoomId};
    // }

    // private async findMatch(playerId: number) {
    //     // ステータスが 'waiting' のリクエストを検索
    //     const match = await this.gameMatchingRequestRepository.findOne({
    //         where: {
    //             requester_id: Not(playerId),
    //             status: 'waiting'
    //         },
    //         order: {
    //             creation_time: 'ASC'
    //         }
    //     });

    //     // // デバッグ用のコンソールログ
    //     // console.log(`Match found: ${JSON.stringify(match)}`);
    //     // console.log(`検索結果: ${match ? JSON.stringify(match) : '該当なし'}`); // 検索結果をログ出力

    //     if (match) {
    //         // 両プレイヤーのステータスを 'matched' に更新
    //         await this.gameMatchingRequestRepository.update({ id: match.id }, { status: 'matched' });
    //         await this.gameMatchingRequestRepository.update({ id: playerId }, { status: 'matched' });
    //         console.log(`Match`);
    //         return match;
    //     }

    //     return null;
    // }
}