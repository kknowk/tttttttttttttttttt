import type { LayoutServerLoadEvent } from './$types';
import { getOriginalRequest } from '$lib/helpers';
import { error, redirect } from '@sveltejs/kit';

export async function load(ev: LayoutServerLoadEvent) {
  console.error(ev.url.pathname);
  const req = getOriginalRequest(ev);
  const user = req?.user;
  if (user != null) {
    if (ev.url.pathname !== '/home/auth' && user.two_factor_authentication_required && !user.is_two_factor_authenticated) throw redirect(307, '/home/auth');
    if (ev.url.pathname === '/') throw redirect(307, '/home');
  }
  return { user };
}
