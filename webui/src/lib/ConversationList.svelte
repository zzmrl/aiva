<script lang="ts">
  import type { Conversation } from './api';
  import { formatPhoneNumber, formatTime } from './utils';

  let {
    conversations,
    selectedPhone = null,
    onselect,
  }: {
    conversations: Conversation[];
    selectedPhone: string | null;
    onselect: (phone: string) => void;
  } = $props();

  let searchQuery = $state('');

  function filterConversations(convos: Conversation[], query: string): Conversation[] {
    if (!query.trim()) return convos;
    const cleaned = query
      .toLowerCase()
      .trim()
      .replace(/\+|\(|\)|-|\s/g, '');
    return convos.filter((c) => c.contact_phone.includes(cleaned));
  }

  const filteredConversations = $derived(filterConversations(conversations, searchQuery));
</script>

<div class="flex flex-col h-full">
  <div class="p-3 border-b border-base-300">
    <input
      type="search"
      placeholder="Search conversations..."
      aria-label="Search conversations"
      class="input input-sm w-full"
      bind:value={searchQuery}
    />
  </div>
  <ul class="overflow-y-auto flex-1" role="list" aria-label="Conversations">
    {#each filteredConversations as conversation (conversation.phone1 + conversation.phone2)}
      {@const contactPhone = conversation.contact_phone}
      <li>
        <button
          class="w-full text-left px-4 py-3 hover:bg-base-200 transition-colors border-b border-base-300 {selectedPhone ===
          contactPhone
            ? 'bg-base-200'
            : ''}"
          onclick={() => onselect(contactPhone)}
          aria-current={selectedPhone === contactPhone ? 'true' : undefined}
        >
          <div class="flex justify-between items-start">
            <span class="font-semibold text-sm">{formatPhoneNumber(contactPhone)}</span>
            <span class="text-xs text-base-content/50 shrink-0 ml-2"
              >{formatTime(conversation.last_message_at)}</span
            >
          </div>
          <p class="text-sm text-base-content/60 mt-1 truncate">
            {conversation.last_message_body}
          </p>
        </button>
      </li>
    {/each}
  </ul>
</div>
