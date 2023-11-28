// import { Controller } from '@nestjs/common';

// @Controller('api/game-matching')
// export class GameMatchingApiController {}

// api-game-matching.controller.ts

import { Controller, Post , Req, UseGuards } from '@nestjs/common';
import { GameMatchingService } from './game-matching.service.js';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IUser } from 'src/user/user.entity.js';

@UseGuards(AuthGuard('jwt'))
@Controller('api/matchmaking')
export class ApiGameMatchingController {
    constructor(private gameMatchingService: GameMatchingService) {}

    @Post('start')
    async startMatchmaking(@Req() req: Request) {
        const user = req.user as IUser;

        console.log(`user.id`, user.id);
        console.log(`user.id`, user.displayName);
        
        return this.gameMatchingService.startMatchmaking(user.id);
    }
}