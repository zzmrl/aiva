<script lang="ts">
  import {
    getSystemPhones,
    getConversations,
    getMessages,
    type Conversation,
    type Message,
  } from '$lib/api';
  import { formatPhoneNumber } from '$lib/utils';
  import { onMount } from 'svelte';
  import ConversationList from '$lib/ConversationList.svelte';
  import ConversationView from '$lib/ConversationView.svelte';
  import ErrorIcon from '$lib/icons/ErrorIcon.svelte';

  let systemPhones = $state<string[]>([]);
  let selectedSystemPhone = $state<string | null>(null);
  let conversations = $state<Conversation[]>([]);
  let messages = $state<Message[]>([]);
  let loading = $state(true);
  let messagesLoading = $state(false);
  let error = $state<unknown>(null);
  let selectedPhone = $state<string | null>(null);

  async function loadConversations() {
    try {
      conversations = await getConversations(selectedSystemPhone ?? undefined);
    } catch (err) {
      console.error(err);
      error = err;
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    try {
      systemPhones = await getSystemPhones();
      if (systemPhones.length >= 1) {
        selectedSystemPhone = systemPhones[0];
      }
    } catch (err) {
      console.error('Failed to fetch system phones', err);
    }
    await loadConversations();
  });

  async function selectSystemPhone(phone: string | null) {
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
      messages = await getMessages(phone, selectedSystemPhone ?? undefined);
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
    class={[
      'w-full',
      'md:w-80',
      'md:border-r',
      'md:border-base-300',
      'shrink-0',
      selectedPhone ? 'hidden md:flex md:flex-col' : 'flex flex-col',
    ]}
  >
    {#if systemPhones.length > 1}
      <div class="p-3 border-b border-base-300">
        <select
          class="select select-sm w-full"
          bind:value={() => selectedSystemPhone, (v) => selectSystemPhone(v)}
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
  <div class={['flex-1', selectedPhone ? 'flex flex-col' : 'hidden md:flex md:flex-col']}>
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
