<script lang="ts">
  export let user_id: number;
  export let callback: null | ((button: HTMLButtonElement, response: Response) => unknown) = null;
  let button: HTMLButtonElement;

  async function clickFunc() {
    button.disabled = true;
    const response = await fetch(`/api/user/set-relationship/${user_id}/0`, { method: 'POST' });
    if (callback) {
      callback(button, response);
    }
  }
</script>

<button data-kind="remove-friend" data-id={user_id} data-new-value="0" on:click={clickFunc} bind:this={button}>Remove Friend</button>
