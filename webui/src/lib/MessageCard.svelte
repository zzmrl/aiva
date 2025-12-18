<script lang="ts">
  import type { Message } from './api';

  let { message }: { message: Message } = $props();

  function formatDate(date: Date | string): string {
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

  function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      const intlCode = match[1] ? '+1 ' : '';
      return `${intlCode}(${match[2]}) ${match[3]}-${match[4]}`;
    }
    return phone;
  }
</script>

<article class="card bg-base-200 shadow-md hover:shadow-lg transition-shadow">
  <div class="card-body">
    <div class="flex justify-between items-start mb-2">
      <div class="flex-1">
        <h3 class="card-title text-sm font-semibold text-base-content/80">
          {formatPhoneNumber(message.sender)}
        </h3>
        <p class="text-xs text-base-content/60 mt-1">
          {formatDate(message.created)}
        </p>
      </div>
      <div class="badge badge-outline badge-sm">
        #{message.id}
      </div>
    </div>
    <p class="text-base text-base-content leading-relaxed whitespace-pre-wrap wrap-break-words">
      {message.body}
    </p>
  </div>
</article>
