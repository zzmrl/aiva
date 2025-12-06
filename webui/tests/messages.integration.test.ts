import { expect, test } from '@playwright/test';
import {
  mockMessages,
  setupMockApi,
  setupMockApiError,
  setupMockApiFailure,
  waitForMessagesLoaded,
} from './test-helpers';

test.describe('Message Archive Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should load and display messages on page load', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Message Archive');
    await waitForMessagesLoaded(page);

    await expect(page.getByRole('article')).toHaveCount(mockMessages.length);

    const firstMessage = page.getByRole('article').first();
    await expect(firstMessage).toContainText('(555) 123-4567');
    await expect(firstMessage).toContainText('Hello, this is a test message');
    await expect(firstMessage).toContainText('#1');
  });

  test('should format phone numbers correctly', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.getByText('(555) 123-4567').first()).toBeVisible();
    await expect(page.getByText('(555) 987-6543')).toBeVisible();
  });

  test('should search messages by phone number', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    // Wait for messages to load
    await expect(page.getByRole('article')).toHaveCount(mockMessages.length);

    // Type in search box
    const searchInput = page.getByRole('searchbox', { name: 'Search messages' });
    await searchInput.fill('5551234567');

    // Should filter to show only messages from that number
    await expect(page.getByRole('article')).toHaveCount(2);
    await expect(page.getByText('(555) 123-4567')).toHaveCount(2);
    await expect(page.getByText('(555) 987-6543')).not.toBeVisible();
  });

  test('should search messages by message body', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.getByRole('article')).toHaveCount(mockMessages.length);

    const searchInput = page.getByRole('searchbox', { name: 'Search messages' });
    await searchInput.fill('different content');

    // Should show only the matching message
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByText('Another message with different content')).toBeVisible();
  });

  test('should search messages by ID', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.getByRole('article')).toHaveCount(mockMessages.length);

    const searchInput = page.getByRole('searchbox', { name: 'Search messages' });
    await searchInput.fill('23754');

    await expect(page.getByRole('article').filter({ visible: true })).toHaveCount(1);
    await expect(page.getByText('#23754')).toBeVisible();
  });

  test('should show search results count when filtering', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.getByRole('article')).toHaveCount(mockMessages.length);

    const searchInput = page.getByRole('searchbox', { name: 'Search messages' });
    await searchInput.fill('5551234567');

    await expect(page.getByText(`Showing 2 of ${mockMessages.length} messages`)).toBeVisible();
  });

  test('should clear search when clicking clear button', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.getByRole('article')).toHaveCount(mockMessages.length);

    const searchInput = page.getByRole('searchbox', { name: 'Search messages' });
    await searchInput.fill('nonexistent');

    await expect(page.getByText('No messages found matching')).toBeVisible();

    await page.getByRole('button', { name: 'Clear search' }).click();

    await expect(page.getByRole('article')).toHaveCount(mockMessages.length);
    await expect(searchInput).toHaveValue('');
  });

  test('should display empty state when no messages', async ({ page }) => {
    await setupMockApi(page, []);

    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.getByText('No messages yet')).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(0);
  });

  test('should display error state when API fails', async ({ page }) => {
    await setupMockApiError(page, 500);

    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(
      page.getByText('Something went wrong loading messages. Please try again later.'),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('should display error state when API is unreachable', async ({ page }) => {
    await setupMockApiFailure(page);

    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(
      page.getByText('Something went wrong loading messages. Please try again later.'),
    ).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // Delay the API response to see loading state
    await page.route('**/messages', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMessages),
      });
    });

    await page.goto('/');

    // Should show loading spinner initially
    await expect(page.getByRole('status', { name: 'Loading messages' })).toBeVisible();
  });

  test('should handle case-insensitive search', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.getByRole('article')).toHaveCount(mockMessages.length);

    const searchInput = page.getByRole('searchbox', { name: 'Search messages' });
    await searchInput.fill('HELLO');

    // Should find message regardless of case
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByText('Hello, this is a test message')).toBeVisible();
  });

  test('should handle partial phone number search', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.getByRole('article')).toHaveCount(mockMessages.length);

    const searchInput = page.getByRole('searchbox', { name: 'Search messages' });
    await searchInput.fill('123-4567');

    // Should find messages with matching phone number
    await expect(page.getByRole('article')).toHaveCount(2);
  });

  test('should display messages in correct order (newest first)', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.getByRole('article')).toHaveCount(mockMessages.length);

    const firstCard = page.getByRole('article').first();
    await expect(firstCard).toContainText('#1');
    await expect(firstCard).toContainText('Hello, this is a test message');

    const lastCard = page.getByRole('article').last();
    await expect(lastCard).toContainText('#23754');
  });

  test('should format dates correctly in message cards', async ({ page }) => {
    // Create messages with recent dates to test formatting
    const recentMessages: typeof mockMessages = [
      {
        id: 1,
        phoneNumber: '5551234567',
        body: 'Just now message',
        createdAt: new Date(Date.now() - 30000), // 30 seconds ago
      },
      {
        id: 2,
        phoneNumber: '5559876543',
        body: 'Minutes ago message',
        createdAt: new Date(Date.now() - 5 * 60000), // 5 minutes ago
      },
      {
        id: 3,
        phoneNumber: '5551111111',
        body: 'Hours ago message',
        createdAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
      },
    ];

    await setupMockApi(page, recentMessages);
    await page.goto('/');
    await waitForMessagesLoaded(page);

    const firstCard = page.getByRole('article').nth(0);
    const secondCard = page.getByRole('article').nth(1);
    const thirdCard = page.getByRole('article').nth(2);

    await expect(firstCard.getByText(/Just now$/)).toBeVisible();
    await expect(secondCard.getByText(/\d+m ago/)).toBeVisible();
    await expect(thirdCard.getByText(/\d+h ago/)).toBeVisible();
  });

  test('should handle search with special characters', async ({ page }) => {
    const specialCharMessages: typeof mockMessages = [
      {
        id: 1,
        phoneNumber: '5551234567',
        body: 'Message with @special #characters & symbols!',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      },
    ];

    await setupMockApi(page, specialCharMessages);
    await page.goto('/');
    await waitForMessagesLoaded(page);

    const searchInput = page.getByRole('searchbox', { name: 'Search messages' });
    await searchInput.fill('@special');

    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByText('@special #characters')).toBeVisible();
  });

  test('should handle whitespace-only search query', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    const searchInput = page.getByRole('searchbox', { name: 'Search messages' });
    await searchInput.fill('   '); // Only whitespace

    // Should show all messages (whitespace is trimmed)
    await expect(page.getByRole('article')).toHaveCount(mockMessages.length);
  });
});
