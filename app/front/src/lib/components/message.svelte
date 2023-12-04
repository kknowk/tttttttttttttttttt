<script lang="ts">
  import { showTimeDiff } from "$lib/time-helper";
  import { onMount } from "svelte";

  export let message_id: number;
  export let user_name: string;
  export let user_id: number;
  export let utcSeconds: number;
  export let content: string;

  export let now: number = Math.floor(Date.now() / 1000);
  export let language: string | null = null;
  export let is_html: boolean;

  $: date = (function () {
    const date = new Date(utcSeconds * 1000);
    if (language == null) {
      return date.toString();
    } else {
      return date.toLocaleString(language);
    }
  })();

  onMount(() => {
    language ??= navigator.language;
  });
</script>

<article id="message-{message_id}" title={message_id.toString()}>
  <div>
    <span>
      Sender: <a href="/user/{user_id}">{user_name}</a>
    </span>
    <time title={date}>
      Time: {showTimeDiff(utcSeconds, now)}
    </time>
  </div>
  {#if is_html}
    {@html content}
  {:else}
    <pre>{content}</pre>
  {/if}
</article>

<style>
  pre {
    font-family: unset;
  }
</style>
