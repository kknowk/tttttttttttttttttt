import { WebSocketGateway, SubscribeMessage, WebSocketServer, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface PlayerState {
    paddleX: number;
    ready: boolean;
    position: 'top' | 'bottom';
    name: string; // ユーザー名を追加
    score: number;
}

interface BallState {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
}

interface GameRoom {
    players: Record<string, PlayerState>;
    ball: BallState;
    gameInterval: NodeJS.Timeout | null;
    gameStarted: boolean;
    isLunatic: boolean;
    winnerId?: string;
    loserId?: string;
    gameOver: boolean;
}

@WebSocketGateway()
export class GameGateway {
    @WebSocketServer()
    server;

    private gameRooms: Record<string, GameRoom> = {};

    handleConnection(client: Socket) {
        const gameRoomId = client.handshake.query.gameRoomId as string;
        console.log(`Client connected to Game Room: ${gameRoomId}`);
        console.log(`Client ID: ${client.id}`);

        if (!this.gameRooms[gameRoomId]) {
            this.gameRooms[gameRoomId] = {
                players: {},
                ball: { x: 450, y: 300, dx: 2, dy: 2, radius: 10 },
                gameInterval: null,
                gameStarted: false,
                isLunatic: false,
                gameOver: false
            };
        }

        const gameRoom = this.gameRooms[gameRoomId];
        // プレイヤーの位置を決定
        const position = Object.keys(gameRoom.players).length === 0 ? 'bottom' : 'top';
        // プレイヤーの名前を設定（ここでは仮に固定の名前を使用）
        const name = position === 'bottom' ? 'Player 1' : 'Player 2';

        gameRoom.players[client.id] = { paddleX: 450, ready: false, position, name, score: 5 };
        console.log(`Client ID: ${gameRoom.players[client.id].score}`);
    }

    @SubscribeMessage('playerReady')
    handlePlayerReady(@ConnectedSocket() client: Socket) {
        const gameRoomId = client.handshake.query.gameRoomId as string;
        const gameRoom = this.gameRooms[gameRoomId];
        gameRoom.players[client.id].ready = true;
        this.checkStartGame(gameRoomId);
    }

    @SubscribeMessage('Lunatic')
    handleLunaticReady(@ConnectedSocket() client: Socket) {
        const gameRoomId = client.handshake.query.gameRoomId as string;
        const gameRoom = this.gameRooms[gameRoomId];

        if (!gameRoom) return;
        if (gameRoom.players[client.id]) {
            gameRoom.players[client.id].ready = true;
            gameRoom.isLunatic = true; // ルナティックモードを有効にする
        }
        this.checkStartGame(gameRoomId); // ゲームルームIDに基づいてゲームを開始するかをチェック
    }

    @SubscribeMessage('movePaddle')
    handleMovePaddle(@MessageBody() data: { paddleX: number }, @ConnectedSocket() client: Socket) {
        const gameRoomId = client.handshake.query.gameRoomId as string;
        const gameRoom = this.gameRooms[gameRoomId];

        if (!gameRoom || !gameRoom.gameStarted)
            return;

        if (gameRoom.players[client.id]) {
            gameRoom.players[client.id].paddleX = data.paddleX; // プレイヤーのパドル位置を更新
        }
    }

    private checkStartGame(gameRoomId: string) {
        const gameRoom = this.gameRooms[gameRoomId];
        if (Object.values(gameRoom.players).every(player => player.ready)) {
            gameRoom.gameStarted = true;
            this.server.emit('startGame', { gameRoomId });
            gameRoom.gameInterval = setInterval(() => {
                this.updateGameState(gameRoomId);
            }, 1000 / 60);
        }
    }

    private updateGameState(gameRoomId: string) {
        const gameRoom = this.gameRooms[gameRoomId];
        if (!gameRoom || !gameRoom.gameStarted)
            return;

        // ボールの位置を更新
        gameRoom.ball.x += gameRoom.ball.dx;
        gameRoom.ball.y += gameRoom.ball.dy;

        // 左右の壁に衝突した場合の処理
        if (gameRoom.ball.x - gameRoom.ball.radius < 0 || gameRoom.ball.x + gameRoom.ball.radius > 900) {
            gameRoom.ball.dx = -gameRoom.ball.dx;
            if (gameRoom.isLunatic) {
                gameRoom.ball.dx *= 1.5;
                gameRoom.ball.dy *= 1.5;
            }
        }

        // プレイヤーのパドルに衝突した場合の処理
        Object.values(gameRoom.players).forEach(player => {
            if ((player.position === 'bottom' && gameRoom.ball.y + gameRoom.ball.radius > 600 - 10) ||
                (player.position === 'top' && gameRoom.ball.y - gameRoom.ball.radius < 10)) {
                if (gameRoom.ball.x > player.paddleX && gameRoom.ball.x < player.paddleX + 75) {
                    gameRoom.ball.dy = -gameRoom.ball.dy;
                }
            }
        });

        // ゲームオーバーのチェック
        // 上下の壁に衝突した場合の処理
        if (gameRoom.ball.y - gameRoom.ball.radius < 0 || gameRoom.ball.y + gameRoom.ball.radius > 600) {

            Object.values(gameRoom.players).forEach(player => {

                if (gameRoom.ball.y - gameRoom.ball.radius < 0 && player.position === 'top') {

                    player.score--;
                    console.log(`player.score: ${player.score}`);
                }
                else if (gameRoom.ball.y + gameRoom.ball.radius > 600 && player.position === 'bottom') {
                    player.score--;
                    console.log(`player.score: ${player.score}`);
                }
                if (player.score <= 0)
                    gameRoom.gameOver = true;
            });

            if (gameRoom.gameOver) {
                // 勝者と敗者を決定
                let winnerId: string | null = null;
                let loserId: string | null = null;

                Object.entries(gameRoom.players).forEach(([clientId, player]) => {
                    if (player.score > 0) {
                        winnerId = clientId;
                    } else {
                        loserId = clientId;
                    }
                });

                if (winnerId && loserId) {

                    // ゲームオーバー時のイベントを送信
                    console.log(`winner ID: ${winnerId}`);
                    console.log(`loser ID: ${loserId}`);

                    gameRoom.winnerId = winnerId;
                    gameRoom.loserId = loserId;
                    // this.server.to(gameRoomId).emit('gameOver', { winner: winnerId, loser: loserId });

                    Object.keys(gameRoom.players).forEach(clientId => {
                        this.server.to(clientId).emit('gameOver', { winner: winnerId, loser: loserId });
                    });

                    console.log(`gameRoom.winnerId: ${gameRoom.winnerId}`);
                    clearInterval(gameRoom.gameInterval);
                    return;
                }
            }

            // ボールを初期位置にリセット
            gameRoom.ball.x = 450;
            gameRoom.ball.y = 300;
            gameRoom.ball.dx = 2;
            gameRoom.ball.dy = 2;

            // ゲームルームの状態をリセット
            clearInterval(gameRoom.gameInterval);

            // 3秒後にゲームを再開
            setTimeout(() => {
                // ゲームルームの状態をリセット
                gameRoom.gameStarted = true;
                gameRoom.gameOver = false;
                gameRoom.isLunatic = false;
                gameRoom.gameInterval = setInterval(() => this.updateGameState(gameRoomId), 1000 / 60); // 新しいゲームループを開始
            }, 3000);
        }

        // ゲーム状態を各クライアントに送信
        Object.keys(gameRoom.players).forEach(clientId => {
            const clientBallY = gameRoom.players[clientId].position === 'top' ? 600 - gameRoom.ball.y : gameRoom.ball.y;
            this.server.to(clientId).emit('gameState', {
                players: gameRoom.players,
                ball: { ...gameRoom.ball, y: clientBallY }
            });
        });
    }
}




// // import { Req } from '@nestjs/common';
// import { WebSocketGateway, SubscribeMessage, WebSocketServer, ConnectedSocket, MessageBody } from '@nestjs/websockets';
// import { Socket } from 'socket.io';
// // import { IUser } from 'src/user/user.entity.js';
// // import type { Request } from 'express';

// let isLunatic = false;

// interface PlayerState {
//     paddleX: number;
//     ready: boolean;
//     position: 'top' | 'bottom';
//     name: string; // ユーザー名を追加
//     score: number;
//     // room_id: number;
// }

// interface BallState {
//     x: number;
//     y: number;
//     dx: number;
//     dy: number;
//     radius: number;
// }

// @WebSocketGateway()
// export class GameGateway {
//     @WebSocketServer()
//     server;

//     private rooms: Map<string, {gameInterval: NodeJS.Timeout; players: Record<string, PlayerState; ball: BallState; gameStarted: boolean;}>;
//     private gameInterval: NodeJS.Timeout; // ゲームループ用のタイマー
//     private players: Record<string, PlayerState> = {};
//     private ball: BallState = { x: 450, y: 300, dx: 2, dy: 2, radius: 10 }; // ボールの初期状態
//     private gameStarted = false;

//     handleConnection(client: Socket) {

//         // すべての接続中のプレイヤーのIDを取得し、ソートする
//         const sortedIds = Object.keys(this.players).sort();

//         // 最初に接続したプレイヤー（IDが最小）を「bottom」に設定
//         const position = sortedIds.length === 0 || client.id === sortedIds[0] ? 'bottom' : 'top';

//         const name = sortedIds.length === 0 || client.id === sortedIds[0] ? 'Bob' : 'Tom';


//         // 新しいプレイヤーの状態を設定
//         this.players[client.id] = { paddleX: 0, ready: false, position, score: 5, name };
//     }

//     @SubscribeMessage('playerReady')
//     handlePlayerReady(@MessageBody() data: {roomId: string}, @ConnectedSocket() client: Socket) {
//         this.players[client.id].ready = true;
//         this.checkStartGame();
//     }

//     @SubscribeMessage('Lunatic')
//     handleLunaticReady(@MessageBody() data: {roomId: string}, @ConnectedSocket() client: Socket) {
//         this.players[client.id].ready = true;
//         isLunatic = true;
//         this.checkStartGame();
//     }

//     @SubscribeMessage('movePaddle')
//     handleMovePaddle(@MessageBody() data: { roomId: string, paddleX: number }, @ConnectedSocket() client: Socket) {
//         if (!this.gameStarted) return;
//         this.players[client.id].paddleX = data.paddleX; // プレイヤーのパドル位置を更新
//     }

//     private checkStartGame() {
//         if (Object.values(this.players).every(player => player.ready)) {
//             this.gameStarted = true;
//             this.server.emit('startGame');
//             this.gameInterval = setInterval(async () => this.updateGameState(), 1000 / 60); // 60FPSで更新
//         }
//     }

//     private updateGameState() {
//         // ボールの位置を更新
//         this.ball.x += this.ball.dx;
//         this.ball.y += this.ball.dy;

//         // 左右の壁に衝突した場合の処理
//         if (this.ball.x - this.ball.radius < 0 || this.ball.x + this.ball.radius > 900) {
//             if (isLunatic == false)
//                 this.ball.dx = -this.ball.dx; // X方向の速度を反転
//             else
//             {
//                 this.ball.dx = -this.ball.dx;
//                 this.ball.dx *= 1.5;
//                 this.ball.dy *= 1.5;
//             }
//         }
//         // プレイヤーのパドルに衝突した場合の処理
//         Object.values(this.players).forEach(async player => {
//             console.log(`ボールのY座標: ${this.ball.y}`);
//             console.log(`ボールのX座標: ${this.ball.x}`);
//             console.log(`プレイヤーのX座標: ${player.paddleX}`);
//             if (player.position === 'bottom' && this.ball.y + this.ball.radius > 600 - 10 ||
//                 player.position === 'top' && this.ball.y - this.ball.radius < 10) {
//                 if (this.ball.x > player.paddleX && this.ball.x < player.paddleX + 75) {
//                     this.ball.dy = -this.ball.dy;
//                 }
//             }
//         });

//         // ゲームオーバーのチェック
//         let gameOver = false;
//         let winnerId = null;
//         let loserId = null;

//         // 上下の壁に衝突した場合の処理
//         if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > 600) {

//             Object.values(this.players).forEach(player => {
//                 if (this.ball.y - this.ball.radius < 0 && player.position === 'top') {
//                     player.score--;
//                 }
//                 else if (this.ball.y + this.ball.radius > 600 && player.position === 'bottom')
//                     player.score--;
//                 if (player.score <= 0) gameOver = true;
//             });

//             Object.entries(this.players).forEach(([clientId, player]) => {
//                 if (player.score <= 0) {
//                     loserId = clientId;
//                 } else {
//                     winnerId = clientId;
//                 }
//             });

//             if (gameOver && winnerId && loserId) {
//                 this.server.emit('gameOver', { winner: winnerId, loser: loserId });
//                 clearInterval(this.gameInterval);
//                 return;
//             }

//             // ボールを初期位置にリセット
//             this.ball.x = 450;
//             this.ball.y = 300;
//             this.ball.dx = 2;
//             this.ball.dy = 2;

//             clearInterval(this.gameInterval); // 現在のゲームループを停止

//             // 3秒後にゲームを再開
//             setTimeout(() => {
//                 this.gameInterval = setInterval(() => this.updateGameState(), 1000 / 60); // 新しいゲームループを開始
//             }, 3000);
//         }

//         // 各クライアントにゲーム状態を送信
//         Object.keys(this.players).forEach(clientId => {
//             const clientBallY = this.players[clientId].position === 'top' ? 600 - this.ball.y : this.ball.y;
//             this.server.to(clientId).emit('gameState', {
//                 players: this.players,
//                 ball: { ...this.ball, y: clientBallY }
//             });
//         });
//     }
// }



// import { WebSocketGateway, SubscribeMessage, WebSocketServer, ConnectedSocket, MessageBody } from '@nestjs/websockets';
// import { Socket } from 'socket.io';

// let isLunatic = false;

// interface PlayerState {
//     paddleX: number;
//     ready: boolean;
//     position: 'top' | 'bottom';
//     name: string; // ユーザー名を追加
//     score: number;
//     // room_id: number;
// }

// interface BallState {
//     x: number;
//     y: number;
//     dx: number;
//     dy: number;
//     radius: number;
// }

// interface GameRoom {
//     [x: string]: any;
//     players: Record<string, PlayerState>;
//     ball: BallState;
//     gameInterval: NodeJS.Timeout | null;
// }

// @WebSocketGateway()
// export class GameGateway {
//     @WebSocketServer() server;

//     private gameRooms: Record<string, GameRoom> = {};


//     handleConnection(client: Socket) {
//         const gameRoomId = client.handshake.query.gameRoomId as string;
//         if (!this.gameRooms[gameRoomId]) {
//             this.gameRooms[gameRoomId] = {
//                 players: {},
//                 ball: { x: 450, y: 300, dx: 2, dy: 2, radius: 10 },
//                 gameInterval: null,
//             };
//         }

//         const gameRoom = this.gameRooms[gameRoomId];
//         // プレイヤーの位置を決定
//         const position = Object.keys(gameRoom.players).length === 0 ? 'bottom' : 'top';
//         // プレイヤーの名前を設定（ここでは仮に固定の名前を使用）
//         const name = position === 'bottom' ? 'Player 1' : 'Player 2';

//         gameRoom.players[client.id] = { paddleX: 0, ready: false, position, name, score: 5 };
//     }

//     @SubscribeMessage('playerReady')
//     handlePlayerReady(@ConnectedSocket() client: Socket) {
//         const gameRoomId = client.handshake.query.gameRoomId as string;
//         const gameRoom = this.gameRooms[gameRoomId];
//         gameRoom.players[client.id].ready = true;
//         this.checkStartGame(gameRoomId);
//     }

//     @SubscribeMessage('Lunatic')
//     handleLunaticReady(@ConnectedSocket() client: Socket) {
//         this.players[client.id].ready = true;
//         isLunatic = true;
//         this.checkStartGame();
//     }

//     @SubscribeMessage('movePaddle')
//     handleMovePaddle(@MessageBody() data: { paddleX: number }, @ConnectedSocket() client: Socket) {
//         const gameRoomId = client.handshake.query.gameRoomId as string;
//         const gameRoom = this.gameRooms[gameRoomId];

//         if (!gameRoom || !gameRoom.gameStarted) return;
//         if (gameRoom.players[client.id]) {
//             gameRoom.players[client.id].paddleX = data.paddleX; // プレイヤーのパドル位置を更新
//         }
//     }

//     private checkStartGame(gameRoomId: string) {
//         const gameRoom = this.gameRooms[gameRoomId];
//         if (Object.values(gameRoom.players).every(player => player.ready)) {
//             gameRoom.gameInterval = setInterval(() => this.updateGameState(gameRoomId), 1000 / 60);
//         }
//     }


//     private updateGameState(gameRoomId: string) {

//         const gameRoom = this.gameRooms[gameRoomId];
//         // ボールの位置を更新
//         this.ball.x += this.ball.dx;
//         this.ball.y += this.ball.dy;

//         // 左右の壁に衝突した場合の処理
//         if (this.ball.x - this.ball.radius < 0 || this.ball.x + this.ball.radius > 900) {
//             if (isLunatic == false)
//                 this.ball.dx = -this.ball.dx; // X方向の速度を反転
//             else {
//                 this.ball.dx = -this.ball.dx;
//                 this.ball.dx *= 1.5;
//                 this.ball.dy *= 1.5;
//             }
//         }
//         // プレイヤーのパドルに衝突した場合の処理
//         Object.values(this.players).forEach(async player => {
//             console.log(`ボールのY座標: ${this.ball.y}`);
//             console.log(`ボールのX座標: ${this.ball.x}`);
//             console.log(`プレイヤーのX座標: ${player.paddleX}`);
//             if (player.position === 'bottom' && this.ball.y + this.ball.radius > 600 - 10 ||
//                 player.position === 'top' && this.ball.y - this.ball.radius < 10) {
//                 if (this.ball.x > player.paddleX && this.ball.x < player.paddleX + 75) {
//                     this.ball.dy = -this.ball.dy;
//                 }
//             }
//         });

//         // ゲームオーバーのチェック
//         let gameOver = false;
//         let winnerId = null;
//         let loserId = null;

//         // 上下の壁に衝突した場合の処理
//         if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > 600) {

//             Object.values(this.players).forEach(player => {
//                 if (this.ball.y - this.ball.radius < 0 && player.position === 'top') {
//                     player.score--;
//                 }
//                 else if (this.ball.y + this.ball.radius > 600 && player.position === 'bottom')
//                     player.score--;
//                 if (player.score <= 0) gameOver = true;
//             });

//             Object.entries(this.players).forEach(([clientId, player]) => {
//                 if (player.score <= 0) {
//                     loserId = clientId;
//                 } else {
//                     winnerId = clientId;
//                 }
//             });

//             if (gameOver && winnerId && loserId) {
//                 this.server.emit('gameOver', { winner: winnerId, loser: loserId });
//                 clearInterval(this.gameInterval);
//                 return;
//             }

//             // ボールを初期位置にリセット
//             this.ball.x = 450;
//             this.ball.y = 300;
//             this.ball.dx = 2;
//             this.ball.dy = 2;

//             clearInterval(this.gameInterval); // 現在のゲームループを停止

//             // 3秒後にゲームを再開
//             setTimeout(() => {
//                 this.gameInterval = setInterval(() => this.updateGameState(), 1000 / 60); // 新しいゲームループを開始
//             }, 3000);
//         }

//         // 各クライアントにゲーム状態を送信
//         Object.keys(this.players).forEach(clientId => {
//             const clientBallY = this.players[clientId].position === 'top' ? 600 - this.ball.y : this.ball.y;
//             this.server.to(clientId).emit('gameState', {
//                 players: this.players,
//                 ball: { ...this.ball, y: clientBallY }
//             });
//         });
//     }
// }
