<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import type { Change2faData, ChangeEmailData, ChangeNameData } from './+page.server';

  export let data: PageData;

  export let form: ChangeNameData | Change2faData | ChangeEmailData | null;

  if (form?.id === 'change-name') {
    if (data.user) {
      data.user.displayName = form.value;
    }
  } else if (form?.id === 'change-two-factor-authentication-required') {
    if (data.user) {
      data.user.two_factor_authentication_required = form.value;
    }
  } else if (form?.id === 'change-email') {
    data.email = form.value;
  }

  let elem: HTMLInputElement;

  onMount(() => {
    elem.checked = data.user?.two_factor_authentication_required ?? false;
  });

  function change2fa() {
    if (data.user) {
      data.user.two_factor_authentication_required = elem.checked;
    }
  }
</script>

<form method="post" use:enhance action="?/change-name">
  <label>
    Name: <span>{data.user?.displayName}</span>:
    <input type="text" name="change-name-value" minlength="1" maxlength="16" required />
  </label>
  <input type="submit" value="Change" class="hide-start" />
</form>
<form method="post" use:enhance action="?/change-two-factor-authentication-required">
  <label>
    Two Factor Authentication:
    <input type="checkbox" name="change-two-factor-authentication-required-value" bind:this={elem} required on:change={change2fa} />
  </label>
  <span>
    {#if data.user?.two_factor_authentication_required ?? false}
      Now: Requires Two Factor Authentication
    {:else}
      Now: No Requirement
    {/if}
  </span>
  <input type="submit" value="Change" />
</form>
<form method="post" use:enhance action="?/change-email">
  <label for="change-email-value">
    Email: <span>{data.email}</span>
    <input type="email" name="change-email-value" minlength="1" maxlength="254" />
  </label>
  <input type="submit" value="Change" class="hide-start" />
</form>
<form use:enhance action="?/change-avatar">
  <label>
    Your new avatar (should be smaller or equal to 100kb):
    <input type="file" required name="change-avatar-value" accept=".jpg,.jxl,image/jpeg,image/jxl" capture="user" />
  </label>
  <input type="submit" value="Change" class="hide-start" />
</form>

<style>
  .hide-start {
    display: none;
  }
  :is(:valid, :has(:valid)) + .hide-start {
    display: unset;
  }
</style>
