<script lang="ts">
  import UserMenu from '$lib/components/user-menu.svelte';
</script>

<header class="sticky">
  <UserMenu />
</header>
<slot />

<style>
  .sticky {
    position: sticky;
  }
</style>
