<script lang="ts">
  import { onMount } from 'svelte';
  import type { ActionData, PageData } from './$types';
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';

  export let data: PageData;
  export let form: ActionData;

  let recommendation = false;
  let submit_button: HTMLInputElement;

  const sendMail = async () => {
    if (data.user?.is_two_factor_authenticated) {
      goto('/home', { invalidateAll: true });
    }
    recommendation = false;
    submit_button.setAttribute('disabled', 'disabled');
    const response = await fetch('/auth/send-mail', {
      method: 'POST',
      credentials: 'same-origin',
      mode: 'same-origin',
      cache: 'no-cache',
    });
    if (response.ok) {
      submit_button.removeAttribute('disabled');
    } else {
      recommendation = true;
    }
  };

  onMount(sendMail);
</script>

<svelte:head>
  <title>Two Factor Authentication Page</title>
</svelte:head>
<form method="post" use:enhance action="/home/auth">
  <label>
    Challenge Code (6 digit):
    <input name="challenge" type="text" pattern="[0-9]{'{'}6{'}'}" />
  </label>
  <input disabled bind:this={submit_button} type="submit" />
  {#if form != null && form.success === false}
    <p>Challenge code is invalid. Please retry.</p>
  {/if}
</form>

<h1 style="display: {recommendation ? 'unset' : 'none'};">You should resend challenge code.</h1>

<button on:click={sendMail}>Re-send Challenge Code</button>
