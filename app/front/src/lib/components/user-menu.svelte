<script lang="ts">
  import NoticeBadge from "$lib/components/notice-badge.svelte";
</script>

<nav>
  <menu>
    <a href="/home">Home</a>
    <a href="/home/setting">Personal Setting</a>
    <a href="/home/friend">My Friends</a>
    <a href="/home/direct-message/list">Direct Messages</a>
    <a href="/home/chat/list">Chats</a>
    <NoticeBadge />
    <form method="post" action="/auth/logout">
      <input type="submit" value="Logout" />
    </form>
  </menu>
</nav>

<style>
  form {
    display: inline;
  }

  input {
    background: none;
    color: blue;
    border: none;
    padding: 0;
    margin: 0;
    text-decoration: underline;
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
  }
</style>
