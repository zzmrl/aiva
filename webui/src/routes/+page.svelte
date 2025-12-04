<script lang="ts">
  import { getMessages, type Message } from '$lib/api';
  import { onMount } from 'svelte';
  import MessageCard from '$lib/MessageCard.svelte';
  import ErrorIcon from '$lib/icons/ErrorIcon.svelte';

  let messages: Message[] = $state([]);
  let loading = $state(true);
  let error: unknown = $state(null);
  let searchQuery = $state('');

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

  function filterMessages(messages: Message[], query: string): Message[] {
    if (!query.trim()) {
      return messages;
    }

    const lowerQuery = query.toLowerCase().trim();
    return messages.filter((message) => {
      // Search in phone number
      if (message.phoneNumber.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      // Search in message body
      if (message.body.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      // Search in ID
      if (message.id.toString().includes(lowerQuery)) {
        return true;
      }
      return false;
    });
  }
  const filteredMessages = $derived(filterMessages(messages, searchQuery));
</script>

<div class="container mx-auto max-w-6xl mb-6">
  <div class="flex flex-col md:flex-row md:inline-flex justify-between w-full gap-2">
    <h1 class="text-xl font-bold text-center">Message Archive</h1>
    <input
      type="text"
      placeholder="Search messages..."
      class="input w-full md:w-80"
      bind:value={searchQuery}
    />
  </div>
</div>
<div class="container mx-auto max-w-6xl mb-6">
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
  {:else if filteredMessages.length === 0 && searchQuery.trim()}
    <div class="text-center py-12">
      <p class="text-base-content/60">No messages found matching "{searchQuery}".</p>
      <button class="btn btn-sm btn-ghost mt-2" onclick={() => (searchQuery = '')}>
        Clear search
      </button>
    </div>
  {:else}
    {#if searchQuery.trim()}
      <div class="mb-4 text-sm text-base-content/60">
        Showing {filteredMessages.length} of {messages.length} messages
      </div>
    {/if}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      {#each filteredMessages as message (message.id)}
        <MessageCard {message} />
      {/each}
    </div>
  {/if}
</div>
