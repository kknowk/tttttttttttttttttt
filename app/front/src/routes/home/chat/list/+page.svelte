<script lang="ts">
  import type { PageData } from './$types';
  import CreateNewChatRoomForm from '$lib/components/create-new-chat-room-form.svelte';
  import type { ChatRoomKind } from '$lib/back/chat-room/chat-room.entity';
  import { goto } from '$app/navigation';

  export let data: PageData;
  let rooms = data.rooms;

  async function createNewChatRoom(_: HTMLButtonElement, name: string, kind: ChatRoomKind, password?: string): Promise<boolean> {
    const response = await fetch('/api/chat-room/create', {
      method: 'POST',
      body: JSON.stringify({
        name,
        kind,
        password,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      const room_id = await response.text();
      await goto(`/chat/${room_id}`, { invalidateAll: true });
      return true;
    } else {
      console.error(response);
      return false;
    }
  }
</script>

<svelte:head>
  <title>{data.user.displayName}'s Chats</title>
</svelte:head>

<details>
  <summary>Create New Chat Room</summary>
  <CreateNewChatRoomForm callback={createNewChatRoom} />
</details>

<main>
  <ul>
    {#each rooms as room}
      <li>
        <a href="/chat/{room.id}">{room.name}</a>
      </li>
    {/each}
  </ul>
</main>
