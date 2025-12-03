<script lang="ts">
  import { getMessages, type Message } from '$lib/api';
  import { onMount } from 'svelte';
  import MessageCard from '$lib/MessageCard.svelte';
  import ErrorIcon from '$lib/icons/ErrorIcon.svelte';

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

<div class="container mx-auto max-w-6xl">
  <div class="inline-flex justify-between w-full">
    <h1 class="text-2xl font-bold text-center mb-6">
      <span class="text-primary">Automate.It Virtual Assistant</span> Message Archive
    </h1>
    <input type="text" placeholder="Search" class="input w-24 md:w-auto" />
  </div>
</div>

<div class="container mx-auto max-w-6xl">
  {#if loading && !messages}
    <div class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if error}
    <div class="alert alert-error">
      <ErrorIcon />
      <span>Something went wrong loading messages. Please try again later.</span>
    </div>
  {:else if messages && messages.length === 0}
    <div class="text-center py-12">
      <p class="text-base-content/60">No messages yet.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each messages as message (message.id)}
        <MessageCard {message} />
      {/each}
    </div>
  {/if}
</div>
