<script lang="ts">
  import type { IUserWithRelationship } from '$lib/back/user/user.entity';
  import type { PageData } from './$types';
  import SetRelationshipButtons from '$lib/components/set-relationship-buttons.svelte';

  export let data: PageData;
  let isMatching = false;
  let matchFound = false;
  let matchDetails = null;

  async function startMatchmaking() {
    isMatching = true;
    matchFound = false;
    try {
      const response = await fetch('/api/matchmaking/start', {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        matchDetails = result.match;
        matchFound = true;
        // ゲーム画面へのリダイレクトをスケジュール (例: 10秒後)
        // if (browser) {
        setTimeout(() => (window.location.href = '/game_pong'), 10000);
        // }
      }
    } catch (error) {
      console.error('Matchmaking error:', error);
    } finally {
      isMatching = false;
    }
  }

  let user_name: string = '';

  async function searchByName(user_name: string): Promise<IUserWithRelationship[]> {
    if (user_name.length === 0) return [];
    const response = await fetch(`/api/user/find-by-partial-name/${encodeURIComponent(user_name)}`);
    return await response.json();
  }

  $: users_promise = searchByName(user_name);

  function callbackInvalidate() {
    user_name = '';
  }
</script>

<svelte:head>
  <title>{data.user?.displayName}'s Home</title>
</svelte:head>

{#if isMatching}
  <p>マッチング中です。しばらくお待ちください...</p>
  <img src="/loli.jpg" alt="uisama" />
{:else if matchFound}
  <p>マッチが見つかりました！ゲームがまもなく開始します。</p>
  <img src="/naki.jpeg" alt="uisaman" />
{:else}
  <button on:click={startMatchmaking}>マッチメイキングを開始</button>
{/if}

<search>
  <form
    on:submit={(ev) => {
      ev.preventDefault();
    }}
  >
    <label>
      Search by user name:
      <input type="search" bind:value={user_name} />
    </label>
  </form>
  <ul>
    {#await users_promise then users}
      {#each users as user}
        {#if user.relationship !== -1}
          <li>
            <a href="/user/{user.id}">{user.displayName}</a>
            <a href="/home/direct-message/{user.id}">Send Direct Message</a>
            <SetRelationshipButtons user_id={user.id} user_relationship={user.relationship} callback={callbackInvalidate} />
          </li>
        {/if}
      {/each}
    {/await}
  </ul>
</search>
