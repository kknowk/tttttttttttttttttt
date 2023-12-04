<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<slot />

<style>
  :global(body) {
    margin: unset;
  }

  :global(menu) {
    padding-inline-start: unset;
    margin-block-start: unset;
    margin-block-end: unset;
    margin-inline-start: unset;
    margin-inline-end: unset;
  }

  :global(ul) {
    padding-inline-start: unset;
    margin-block-start: unset;
    margin-block-end: unset;
    margin-inline-start: unset;
    margin-inline-end: unset;
  }

  :global(*),
  :global(*):before,
  :global(*):after {
    box-sizing: border-box;
  }
</style>
