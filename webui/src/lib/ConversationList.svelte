<script lang="ts">
  import type { Conversation } from './api';

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

  function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      const intlCode = match[1] ? '+1 ' : '';
      return `${intlCode}(${match[2]}) ${match[3]}-${match[4]}`;
    }
    return phone;
  }

  function formatTime(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  function getContactPhone(conversation: Conversation): string {
    return conversation.contact_phone;
  }

  function filterConversations(convos: Conversation[], query: string): Conversation[] {
    if (!query.trim()) return convos;
    const cleaned = query
      .toLowerCase()
      .trim()
      .replace(/\+|\(|\)|-|\s/g, '');
    return convos.filter((c) => {
      const contact = getContactPhone(c);
      return contact.includes(cleaned);
    });
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
      {@const contactPhone = getContactPhone(conversation)}
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
            {truncate(conversation.last_message_body, 50)}
          </p>
        </button>
      </li>
    {/each}
  </ul>
</div>
