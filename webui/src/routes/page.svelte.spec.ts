import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

vi.mock('$lib/api', () => ({
  getConversations: vi.fn().mockResolvedValue([]),
  getMessages: vi.fn().mockResolvedValue([]),
  getSystemPhones: vi.fn().mockResolvedValue([]),
}));

describe('/+page.svelte', () => {
  it('should render conversation layout', async () => {
    const { default: Page } = await import('./+page.svelte');
    render(Page);

    const status = page.getByText('No conversations yet.');
    await expect.element(status).toBeInTheDocument();
  });
});
