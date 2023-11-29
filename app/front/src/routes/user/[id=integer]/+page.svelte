<script lang="ts">
    import type { UserRelationshipKind } from "$lib/back/user/user.entity";
    import SetRelationshipButtons from "$lib/components/set-relationship-buttons.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;

    function relationshipCallback(
        button: HTMLButtonElement,
        response: Response
    ) {
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

<main>
    <p>Name: <span>{data.user.displayName}</span></p>
    <SetRelationshipButtons
        user_id={data.user.id}
        user_relationship={data.relationship}
        callback={relationshipCallback}
    />
</main>
