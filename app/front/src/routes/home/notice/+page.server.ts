import type { Actions, RequestEvent, PageServerLoadEvent } from "./$types.js";
import { getOriginalRequest, redirectToAuth } from "$lib/helpers.js";

export async function load(ev: PageServerLoadEvent) {
  const req = getOriginalRequest(ev);
  const user = redirectToAuth(ev.url, req?.user);
  let email = null;
  if (user?.id && req?.services?.userService)
    email = await req.services.userService.get_email(user.id);
  return {
    user,
    email,
  };
}
