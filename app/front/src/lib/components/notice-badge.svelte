<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy, onMount } from "svelte";

  let intervalId: number | null = null;
  let noticeCount: number = 0;

  async function periodicFunc() {
    const response = await fetch("/api/user/get-notice-count");
    if (response.ok) {
      const result = await response.json();
      if (typeof result === 'number') {
        noticeCount = result;
      }
    }
  }

  onMount(() => {
    intervalId = setInterval(periodicFunc, 300000) as any as number;
  });

  onDestroy(() => {
    if (browser && typeof intervalId === "number") {
      clearInterval(intervalId);
    }
  });
</script>

<div data-count={noticeCount} class="notice-badge">
  <a href="/home/notice">Notice</a>
</div>

<style>
  .notice-badge[data-count="0"]::before {
    display: none;
  }

  .notice-badge::before {
    content: ' (' attr(data-num) ')';
    color: deeppink;
  }
</style>