<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  onMount(async () => {
    console.log('hash: ' + $page.url.hash);
    if ($page.url.hash.length === 0) {
      await goto('/#main', { invalidateAll: true });
    }
  });
</script>

You are not logged in.

<a href="/auth">Login</a>
