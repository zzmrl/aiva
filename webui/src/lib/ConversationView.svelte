<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { Message } from './api';
  import ChatBubble from './ChatBubble.svelte';

  let {
    messages,
    contactPhone,
    onback,
  }: {
    messages: Message[];
    contactPhone: string;
    onback: () => void;
  } = $props();

  let messagesContainer: HTMLDivElement | undefined = $state();

  function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      const intlCode = match[1] ? '+1 ' : '';
      return `${intlCode}(${match[2]}) ${match[3]}-${match[4]}`;
    }
    return phone;
  }

  async function scrollToBottom() {
    await tick();
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  onMount(() => {
    scrollToBottom();
  });

  $effect(() => {
    if (messages.length) {
      scrollToBottom();
    }
  });
</script>

<div class="flex flex-col h-full">
  <div class="flex items-center gap-3 px-4 py-3 border-b border-base-300 bg-base-100">
    <button
      class="btn btn-ghost btn-sm md:hidden"
      onclick={onback}
      aria-label="Back to conversations"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
          clip-rule="evenodd"
        />
      </svg>
    </button>
    <h2 class="font-semibold text-base">{formatPhoneNumber(contactPhone)}</h2>
  </div>

  <div class="flex-1 overflow-y-auto p-4 space-y-1" bind:this={messagesContainer}>
    {#each messages as message (message.id)}
      <ChatBubble {message} isOutgoing={message.direction === 'outbound'} />
    {/each}
  </div>
</div>
