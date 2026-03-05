<script lang="ts">
  import { getConversations, getMessages, type Conversation, type Message } from '$lib/api';
  import { onMount } from 'svelte';
  import ConversationList from '$lib/ConversationList.svelte';
  import ConversationView from '$lib/ConversationView.svelte';
  import ErrorIcon from '$lib/icons/ErrorIcon.svelte';

  let conversations: Conversation[] = $state([]);
  let messages: Message[] = $state([]);
  let loading = $state(true);
  let messagesLoading = $state(false);
  let error: unknown = $state(null);
  let selectedPhone: string | null = $state(null);

  onMount(async () => {
    try {
      conversations = await getConversations();
    } catch (err) {
      console.error(err);
      error = err;
    } finally {
      loading = false;
    }
  });

  async function selectConversation(phone: string) {
    selectedPhone = phone;
    messagesLoading = true;
    try {
      const fetched = await getMessages(phone);
      messages = fetched.reverse();
    } catch (err) {
      console.error(err);
      messages = [];
    } finally {
      messagesLoading = false;
    }
  }

  function goBack() {
    selectedPhone = null;
    messages = [];
  }
</script>

<div class="flex h-full">
  <!-- Conversation list sidebar -->
  <div
    class="w-full md:w-80 md:border-r md:border-base-300 shrink-0 {selectedPhone
      ? 'hidden md:flex md:flex-col'
      : 'flex flex-col'}"
  >
    {#if loading}
      <div
        class="flex justify-center items-center py-12 flex-1"
        role="status"
        aria-label="Loading conversations"
      >
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    {:else if error}
      <div class="p-4">
        <div class="alert alert-error" role="alert">
          <ErrorIcon />
          <span>Something went wrong loading messages. Please try again later.</span>
        </div>
      </div>
    {:else if conversations.length === 0}
      <div class="text-center py-12 flex-1" role="status">
        <p class="text-base-content/60">No conversations yet.</p>
      </div>
    {:else}
      <ConversationList {conversations} {selectedPhone} onselect={selectConversation} />
    {/if}
  </div>

  <!-- Chat view -->
  <div class="flex-1 {selectedPhone ? 'flex flex-col' : 'hidden md:flex md:flex-col'}">
    {#if selectedPhone}
      {#if messagesLoading}
        <div
          class="flex justify-center items-center py-12 flex-1"
          role="status"
          aria-label="Loading messages"
        >
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {:else}
        <ConversationView {messages} contactPhone={selectedPhone} onback={goBack} />
      {/if}
    {:else}
      <div class="flex items-center justify-center flex-1 text-base-content/40">
        <p>Select a conversation</p>
      </div>
    {/if}
  </div>
</div>
