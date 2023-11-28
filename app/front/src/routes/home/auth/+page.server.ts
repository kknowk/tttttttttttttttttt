import { getOriginalRequest, redirectToAuth } from '$lib/helpers';
import { fail, type Actions, type RequestEvent, redirect } from '@sveltejs/kit';
import type { PageServerLoadEvent } from './$types';

export async function load(ev: PageServerLoadEvent) {
  const req = getOriginalRequest(ev);
  const user = redirectToAuth(ev.url, req?.user);
  if (user?.is_two_factor_authenticated) throw redirect(307, '/home');
  return {
    user,
  };
}

export const actions: Actions = {
  default: async (event: RequestEvent) => {
    const userChallenge = (await event.request.formData())?.get('challenge')?.valueOf();
    if (typeof userChallenge !== 'string') return { success: false };
    const res = await event.fetch('/auth/challenge/' + userChallenge, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-cache',
    });
    if (res.ok) return { success: true };
    return { success: false };
  },
};
