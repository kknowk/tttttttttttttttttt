<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<main>
  <ul>
    {#each data.notices as notice}
      <li id="notice-{notice.id.toString()}">
        <article>{@html notice.content}</article>
      </li>
    {/each}
  </ul>
</main>
