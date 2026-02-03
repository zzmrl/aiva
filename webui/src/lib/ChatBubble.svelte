<script lang="ts">
  import type { Message } from './api';

  let { message, isOutgoing }: { message: Message; isOutgoing: boolean } = $props();

  function formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
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
