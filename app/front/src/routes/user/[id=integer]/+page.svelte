<script lang="ts">
  import UserMenu from "$lib/components/user-menu.svelte";
  import type { UserRelationshipKind } from "$lib/back/user/user.entity";
  import SetRelationshipButtons from "$lib/components/set-relationship-buttons.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  function relationshipCallback(button: HTMLButtonElement, response: Response) {
    if (!response.ok) {
      return;
    }
    const newValue = button.dataset["new-value"];
    if (newValue == null) {
      return;
    }
    const newRelationship = Number.parseInt(newValue);
    if (newRelationship < -1 || newRelationship > 1) {
      return;
    }
    data.relationship = newRelationship as UserRelationshipKind;
  }
</script>

<div class="grid-container">
  <div>
    <UserMenu />
  </div>
  <main class="grid-main">
    <span>Name: {data.user.displayName}</span>
    <SetRelationshipButtons
      user_id={data.user.id}
      user_relationship={data.relationship}
      callback={relationshipCallback}
    />
  </main>
</div>

<style>
  .grid-container {
    display: grid;
    grid-template-columns: auto 1fr;
    min-height: max(100%, 100vh);
  }

  .grid-main {
    padding-top: 1ex;
    padding-left: 0.5em;
  }
</style>
