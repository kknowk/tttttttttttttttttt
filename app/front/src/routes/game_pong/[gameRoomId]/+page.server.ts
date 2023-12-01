import { getOriginalRequest } from '$lib/helpers';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoadEvent } from './$types';

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  if (parent.user == null) {
    throw error(403);
  }
  const user_id = parent.user.id;

  return {
    user_id
  };
}
