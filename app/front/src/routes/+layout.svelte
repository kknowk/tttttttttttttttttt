<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  const consentValue = writable(false);

  onMount(() => {});
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<slot />
<footer />
