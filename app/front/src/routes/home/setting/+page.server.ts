import { fail, redirect } from '@sveltejs/kit';
import type { Actions, RequestEvent, PageServerLoadEvent } from './$types.js';
import { getOriginalRequest, redirectToAuth } from '$lib/helpers.js';

export async function load(ev: PageServerLoadEvent) {
  const req = getOriginalRequest(ev);
  const user = redirectToAuth(ev.url, req?.user);
  let email = null;
  if (user?.id && req?.services?.userService) email = await req.services.userService.get_email(user.id);
  return {
    user,
    email,
  };
}

async function getValue(event: RequestEvent, name: string) {
  const data = await event.request.formData();
  const value = data.get(name + '-value')?.valueOf();
  return value;
}
const changeName = 'change-name';
const change2fa = 'change-two-factor-authentication-required';
const changeEmail = 'change-email';
const changeAvatar = 'change-avatar';

export interface ChangeNameData {
  id: 'change-name';
  value: string;
}
export interface Change2faData {
  id: 'change-two-factor-authentication-required';
  value: boolean;
}
export interface ChangeEmailData {
  id: 'change-email';
  value: string;
}
export interface ChangeAvatar {
  id: 'change-avatar';
  value: boolean;
}

export const actions: Actions = {
  [changeName]: async (event: RequestEvent) => {
    const req = getOriginalRequest(event);
    let user = redirectToAuth(event.url, req?.user);
    if (user == null) return fail(401);
    const service = req?.services?.userService;
    if (service == null) return fail(500);
    const value = await getValue(event, changeName);
    if (value == null || typeof value !== 'string') return fail(400);
    await service.set_display_name(user.id, value);
    user = await service.findById(user.id);
    const answer = { id: changeName, value: user?.displayName };
    return answer as ChangeNameData;
  },
  [change2fa]: async (event: RequestEvent) => {
    const req = getOriginalRequest(event);
    const user = req?.user;
    if (user == null) {
      throw redirect(303, '/auth');
    }
    const service = req?.services?.userService;
    if (service == null) return fail(500);
    const value = await getValue(event, change2fa);
    user.two_factor_authentication_required = value != null;
    await service.set_two_factor_authentication_required(user.id, user.two_factor_authentication_required);
    return { id: change2fa, value: user.two_factor_authentication_required } as Change2faData;
  },
  [changeEmail]: async (event: RequestEvent) => {
    const req = getOriginalRequest(event);
    const user = req?.user;
    if (user == null) {
      throw redirect(303, '/auth');
    }
    const service = req?.services?.userService;
    if (service == null) return fail(500);
    const value = await getValue(event, changeEmail);
    if (typeof value !== 'string') return fail(400);
    const success_or_fail = await service.set_email(user.id, value);
    if (success_or_fail === 0) return fail(400);
    return { id: changeEmail, value } as ChangeEmailData;
  },
  [changeAvatar]: async (event: RequestEvent) => {
    const req = getOriginalRequest(event);
    const user = redirectToAuth(event.url, req?.user);
    if (user == null) {
      return { id: changeAvatar, value: false };
    }
    const service = req?.services?.userService;
    if (service == null) {
      return { id: changeAvatar, value: false };
    }
    const file = await getValue(event, changeAvatar);
    if (!(file instanceof Blob)) {
      return { id: changeAvatar, value: false };
    }
    const success = await service.set_avatar(user.id, file);
    return { id: changeAvatar, value: success };
  },
};
