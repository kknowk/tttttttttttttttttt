<script lang="ts">
  let area: HTMLTextAreaElement;
  let button: HTMLButtonElement;

  export let sendMessageCallback: (
    areaElement: HTMLTextAreaElement,
    buttonElement: HTMLButtonElement
  ) => Promise<void> | void;

  async function keydownHook(event: KeyboardEvent) {
    if (event.key !== "Enter") {
      return;
    }
    if (!event.shiftKey) {
      event.preventDefault();
      button.click();
    } else {
      const currentHeight = area.style.height ?? "4lh";
      const lineHeight = Number.parseInt(currentHeight.slice(0, currentHeight.length - 2)) + 1;
      area.style.height = `${lineHeight}lh`;
    }
  }

  async function submitCallback(ev: SubmitEvent) {
    ev.preventDefault();
    await sendMessageCallback(area, button);
  }
</script>

<form on:submit={submitCallback}>
  <label class="no-show">
    <span>Input Message Text Area:</span>
    <textarea bind:this={area} on:keydown={keydownHook} maxlength="140" />
  </label>
  <button type="submit" bind:this={button}>Send</button>
</form>

<style>
  .no-show span {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  form {
    & textarea {
      width: 100%;
      height: 4lh;
    }

    & button {
      display: block;
      color: unset;
      text-align: center;
      align-items: flex-start;
      cursor: pointer;
      background-color: unset;
      margin: unset;
      padding: unset;
      padding-top: 1ex;
      padding-bottom: 1ex;
      border: unset;
      width: 100%;
      background-color: lavenderblush;
      font-style: unset;
      font-variant-ligatures: unset;
      font-variant-caps: unset;
      font-variant-numeric: unset;
      font-variant-east-asian: unset;
      font-variant-alternates: unset;
      font-variant-position: unset;
      font-weight: unset;
      font-stretch: unset;
      font-size: unset;
      font-family: unset;
      font-optical-sizing: unset;
      font-kerning: unset;
      font-feature-settings: unset;
      font-variation-settings: unset;
    }
  }
</style>
