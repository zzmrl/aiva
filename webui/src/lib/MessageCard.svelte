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
    // Format as (XXX) XXX-XXXX if it's a 10-digit number
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }
</script>

<div class="card bg-base-200 shadow-md hover:shadow-lg transition-shadow">
  <div class="card-body">
    <div class="flex justify-between items-start mb-2">
      <div class="flex-1">
        <h3 class="card-title text-sm font-semibold text-base-content/80">
          {formatPhoneNumber(message.phoneNumber)}
        </h3>
        <p class="text-xs text-base-content/60 mt-1">
          {formatDate(message.createdAt)}
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
</div>
