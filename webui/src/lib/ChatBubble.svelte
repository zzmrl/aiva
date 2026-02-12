<script lang="ts">
  import type { Message } from './api';
  import { formatTime } from './utils';

  let { message, isOutgoing }: { message: Message; isOutgoing: boolean } = $props();
</script>

<div class="chat {isOutgoing ? 'chat-end' : 'chat-start'}">
  <div
    class="chat-bubble {isOutgoing
      ? 'chat-bubble-primary'
      : 'bg-base-200 text-base-content'} whitespace-pre-wrap wrap-break-words"
  >
    {message.body}
  </div>
  <div class="chat-footer opacity-50 text-xs mt-1">
    {formatTime(message.created)}
  </div>
</div>
