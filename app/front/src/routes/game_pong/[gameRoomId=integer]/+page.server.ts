import { getOriginalRequest } from '$lib/helpers';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoadEvent } from './$types';
// import { gameMatchingService } from '$lib/services';

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  if (parent.user == null) {
    throw error(403);
  }

  const services = getOriginalRequest(ev)?.services;
  if (services == null) {
    throw error(500);
  }

  const user_id = parent.user.id;
  console.log("Game Room Id: " + ev.params.gameRoomId);
  const gameRoomId = parseInt(ev.params.gameRoomId);
  const isAllowed = await services.gameMatchingService.checkUserAccessToGameRoom(user_id, gameRoomId);

  if (!isAllowed) {
    throw error(403, "You are not authorized to access this game room");
  }

  return {
    user_id
  };
}
