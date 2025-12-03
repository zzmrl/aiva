<script lang="ts">
  import { getMessages, type Message } from '$lib/api';
  import { onMount } from 'svelte';

  let messages: Message[];
  let loading = true;
  let error: unknown;
  onMount(async () => {
    try {
      messages = await getMessages();
    } catch (err) {
      console.error(err);
      error = err;
    } finally {
      loading = false;
    }
  });
</script>

<h1 class="text-2xl font-bold text-center mb-4">Automate.It Virtual Assistant</h1>
<div>
  <table class="table table-zebra">
    <thead>
      <tr>
        <th>ID</th>
        <th>Phone Number</th>
        <th>Message</th>
        <th>Created At</th>
      </tr>
    </thead>
    <tbody>
      {#if loading && !messages}
        <tr>
          <td colspan="4">Loading...</td>
        </tr>
      {:else if error}
        <tr>
          <td colspan="4">Something went wrong...</td>
        </tr>
      {:else}
        {#each messages as message (message.id)}
          <tr>
            <td>{message.id}</td>
            <td>{message.phoneNumber}</td>
            <td>{message.body}</td>
            <td>{message.createdAt}</td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>
