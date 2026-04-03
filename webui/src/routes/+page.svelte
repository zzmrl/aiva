<script lang="ts">
  import {
    getSystemPhones,
    getConversations,
    getMessages,
    type Conversation,
    type Message,
  } from '$lib/api';
  import { connectNotifications } from '$lib/notifications';
  import { formatPhoneNumber } from '$lib/utils';
  import { onMount, onDestroy } from 'svelte';
  import ConversationList from '$lib/ConversationList.svelte';
  import ConversationView from '$lib/ConversationView.svelte';
  import ErrorIcon from '$lib/icons/ErrorIcon.svelte';

  let systemPhones: string[] = $state([]);
  let selectedSystemPhone: string | undefined = $state();
  let conversations: Conversation[] = $state([]);
  let messages: Message[] = $state([]);
  let loading = $state(true);
  let messagesLoading = $state(false);
  let error: unknown = $state(null);
  let selectedPhone: string | null = $state(null);
  let disconnect: (() => void) | undefined = $state();

  function isInSelectedConversation({ sender, receiver }: Message): boolean {
    if (!selectedPhone) {
      return false;
    }
    if (selectedSystemPhone) {
      return (
        (sender === selectedPhone && receiver === selectedSystemPhone) ||
        (sender === selectedSystemPhone && receiver === selectedPhone)
      );
    }
    return sender === selectedPhone || receiver === selectedPhone;
  }

  async function loadConversations() {
    try {
      conversations = await getConversations(selectedSystemPhone);
    } catch (err) {
      console.error(err);
      error = err;
    } finally {
      loading = false;
    }
  }

  async function loadSystemPhones() {
    try {
      systemPhones = await getSystemPhones();
      if (systemPhones.length >= 1) {
        selectedSystemPhone = systemPhones[0];
      }
    } catch (err) {
      console.error('Failed to fetch system phones', err);
    }
  }

  onMount(async () => {
    await loadSystemPhones();
    await loadConversations();

    disconnect = connectNotifications(async (event) => {
      if (event.type !== 'new_message') {
        return;
      }
      const msg = event.message;
      console.log(msg);

      try {
        conversations = await getConversations(selectedSystemPhone);
      } catch (err) {
        console.error('Failed to refresh conversations', err);
      }
      if (isInSelectedConversation(msg)) {
        messages = [...messages, msg];
      }
    });
  });

  onDestroy(() => {
    disconnect?.();
  });

  async function selectSystemPhone(phone: string) {
    selectedSystemPhone = phone;
    selectedPhone = null;
    messages = [];
    loading = true;
    error = null;
    await loadConversations();
  }

  async function selectConversation(phone: string) {
    selectedPhone = phone;
    messagesLoading = true;
    try {
      const fetched = await getMessages(phone, selectedSystemPhone);
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
    {#if systemPhones.length > 1}
      <div class="p-3 border-b border-base-300">
        <select
          class="select select-sm w-full"
          value={selectedSystemPhone}
          onchange={(e) => selectSystemPhone((e.target as HTMLSelectElement).value)}
          aria-label="Select system phone number"
        >
          {#each systemPhones as phone (phone)}
            <option value={phone}>{formatPhoneNumber(phone)}</option>
          {/each}
        </select>
      </div>
    {/if}
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
