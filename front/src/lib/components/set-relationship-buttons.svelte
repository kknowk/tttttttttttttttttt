<script lang="ts">
  import { default as BanButton } from '$lib/components/ban-button.svelte';
  import { default as AddFriendButton } from '$lib/components/add-friend-button.svelte';
  import { default as RemoveFriendButton } from '$lib/components/remove-friend-button.svelte';
  export let user_id: number;
  export let user_relationship: number;
  export let callback: null | ((button: HTMLButtonElement, response: Response) => unknown) = null;

  async function callbackFunction(button: HTMLButtonElement, response: Response) {
    if (callback === null) {
      return;
    }
    const result = callback(button, response);
    if (result instanceof Promise) {
      await result;
    }
    const kind = button.dataset['kind'];
    switch (kind) {
      case 'add-friend':
        user_relationship = 1;
        break;
      case 'ban':
        user_relationship = -1;
        break;
      case 'remove-friend':
        user_relationship = 0;
        break;
    }
  }
</script>

{#if user_relationship <= 0}
  <AddFriendButton {user_id} callback={callbackFunction} />
{:else}
  <RemoveFriendButton {user_id} callback={callbackFunction} />
{/if}
<BanButton {user_id} callback={callbackFunction} />
