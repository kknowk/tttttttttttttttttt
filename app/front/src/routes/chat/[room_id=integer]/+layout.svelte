<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import SetRelationshipButtons from '$lib/components/set-relationship-buttons.svelte';

  export let data: PageData;
  const administrators: number[] = [];
  const normalMembers: number[] = [];

  $: (() => {
    administrators.splice(0, administrators.length);
    normalMembers.splice(0, normalMembers.length);
    if (data.members == null) {
      return;
    }
    for (const [key, kind] of data.members) {
      if (kind === 2) {
        administrators.push(key);
      } else if (kind === 1) {
        normalMembers.push(key);
      }
    }
  })();
</script>

{#if data.logs && data.members?.get(data.user.id) === 2}
  <menu>
    {#if data.room.kind === 0}
      <a href="/chat/{data.room.id}/invite">Invite</a>
    {/if}
    <a href="/chat/{data.room.id}/kick">Kick</a>
    <a href="/chat/{data.room.id}/mute">Mute</a>
    <a href="/chat/{data.room.id}/ban">Ban</a>
    {#if data.room.owner_id === data.user.id}
      <a href="/chat/{data.room.id}/setting">Setting</a>
    {/if}
    {#if $page.url.pathname !== `/chat/${data.room.id}`}
      <a href="/chat/{data.room.id}">Chat Room</a>
    {/if}
    {#if data.members}
      <details>
        <summary>Members</summary>
        <div>
          {#if administrators.length > 0}
            <p>Administrators</p>
            <ul>
              {#each administrators as member_id}
                {#if member_id === data.user.id}
                  <a href="/user/{data.user.id}">{data.user.displayName}</a>
                {:else if (data.users.get(member_id)?.relationship ?? -1) >= 0}
                  <li>
                    <SetRelationshipButtons user_id={member_id} user_relationship={data.users.get(member_id)?.relationship ?? 0} />
                    <a href="/user/{member_id}">{data.users.get(member_id)?.displayName}</a>
                  </li>
                {/if}
              {/each}
            </ul>
          {/if}
          {#if normalMembers.length > 0}
            <p>Members</p>
            <ul>
              {#each normalMembers as member_id}
                {#if member_id === data.user.id}
                  <a href="/user/{data.user.id}">{data.user.displayName}</a>
                {:else if (data.users.get(member_id)?.relationship ?? -1) >= 0}
                  <li>
                    <SetRelationshipButtons user_id={member_id} user_relationship={data.users.get(member_id)?.relationship ?? 0} />
                    <a href="/user/{member_id}">{data.users.get(member_id)?.displayName}</a>
                  </li>
                {/if}
              {/each}
            </ul>
          {/if}
        </div>
      </details>
    {/if}
  </menu>
{/if}
<slot />
