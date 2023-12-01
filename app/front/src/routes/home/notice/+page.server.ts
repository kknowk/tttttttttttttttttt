import type { PageServerLoadEvent } from "./$types.js";
import { createIRangeRequestWithUserFromURLSearchParams, getOriginalRequest, redirectToAuth } from "$lib/helpers.js";
import { error } from "@sveltejs/kit";

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  if (parent.user == null) {
    throw error(403);
  }
  const service = getOriginalRequest(ev)?.services?.userService;
  if (service == null) {
    throw error(500);
  }
  const params = ev.url.searchParams;
  const rangeRequest = createIRangeRequestWithUserFromURLSearchParams(parent.user.id, params, 50, true);
  if (rangeRequest === null) {
    throw error(500);
  }
  const notices = await service.get_notice(rangeRequest);
  return {
    user: parent.user,
    notices,
  }
}
