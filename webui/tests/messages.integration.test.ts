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

    await expect(page.locator('h1')).toContainText('Message Archive');
    await waitForMessagesLoaded(page);

    // Verify messages are displayed
    await expect(page.locator('.card')).toHaveCount(mockMessages.length);

    // Verify first message content
    const firstMessage = page.locator('.card').first();
    await expect(firstMessage).toContainText('(555) 123-4567');
    await expect(firstMessage).toContainText('Hello, this is a test message');
    await expect(firstMessage).toContainText('#1');
  });

  test('should format phone numbers correctly', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.locator('text=(555) 123-4567')).toBeVisible();
    await expect(page.locator('text=(555) 987-6543')).toBeVisible();
  });

  test('should search messages by phone number', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    // Wait for messages to load
    await expect(page.locator('.card')).toHaveCount(mockMessages.length);

    // Type in search box
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('5551234567');

    // Should filter to show only messages from that number
    await expect(page.locator('.card')).toHaveCount(2);
    await expect(page.locator('text=(555) 123-4567')).toHaveCount(2);
    await expect(page.locator('text=(555) 987-6543')).not.toBeVisible();
  });

  test('should search messages by message body', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.locator('.card')).toHaveCount(mockMessages.length);

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('different content');

    // Should show only the matching message
    await expect(page.locator('.card')).toHaveCount(1);
    await expect(page.locator('text=Another message with different content')).toBeVisible();
  });

  test('should search messages by ID', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.locator('.card')).toHaveCount(mockMessages.length);

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('2');

    // Should show message with ID 2
    await expect(page.locator('.card')).toHaveCount(1);
    await expect(page.locator('text=#2')).toBeVisible();
  });

  test('should show search results count when filtering', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.locator('.card')).toHaveCount(mockMessages.length);

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('5551234567');

    // Should show filtered count
    await expect(page.locator('text=Showing 2 of 3 messages')).toBeVisible();
  });

  test('should clear search when clicking clear button', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.locator('.card')).toHaveCount(mockMessages.length);

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('nonexistent');

    // Should show no results message
    await expect(page.locator('text=No messages found matching')).toBeVisible();

    // Click clear button
    await page.locator('button:has-text("Clear search")').click();

    // Should show all messages again
    await expect(page.locator('.card')).toHaveCount(mockMessages.length);
    await expect(searchInput).toHaveValue('');
  });

  test('should display empty state when no messages', async ({ page }) => {
    // Override route to return empty array
    await setupMockApi(page, []);

    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.locator('text=No messages yet')).toBeVisible();
    await expect(page.locator('.card')).toHaveCount(0);
  });

  test('should display error state when API fails', async ({ page }) => {
    // Override route to return error
    await setupMockApiError(page, 500);

    await page.goto('/');
    await waitForMessagesLoaded(page);

    // Should show error message
    await expect(
      page.locator('text=Something went wrong loading messages. Please try again later.'),
    ).toBeVisible();
    await expect(page.locator('.alert-error')).toBeVisible();
  });

  test('should display error state when API is unreachable', async ({ page }) => {
    // Override route to abort
    await setupMockApiFailure(page);

    await page.goto('/');
    await waitForMessagesLoaded(page);

    // Should show error message
    await expect(
      page.locator('text=Something went wrong loading messages. Please try again later.'),
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
    await expect(page.locator('.loading-spinner')).toBeVisible();
  });

  test('should handle case-insensitive search', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.locator('.card')).toHaveCount(mockMessages.length);

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('HELLO');

    // Should find message regardless of case
    await expect(page.locator('.card')).toHaveCount(1);
    await expect(page.locator('text=Hello, this is a test message')).toBeVisible();
  });

  test('should handle partial phone number search', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.locator('.card')).toHaveCount(mockMessages.length);

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('123-4567');

    // Should find messages with matching phone number
    await expect(page.locator('.card')).toHaveCount(2);
  });

  test('should display messages in correct order (newest first)', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    await expect(page.locator('.card')).toHaveCount(mockMessages.length);

    // First card should be the newest message (ID 1)
    const firstCard = page.locator('.card').first();
    await expect(firstCard).toContainText('#1');
    await expect(firstCard).toContainText('Hello, this is a test message');

    // Last card should be the oldest message (ID 3)
    const lastCard = page.locator('.card').last();
    await expect(lastCard).toContainText('#3');
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

    // Check that date formatting appears (exact text depends on timing, so we check for presence)
    const firstCard = page.locator('.card').first();
    await expect(firstCard.locator('text=/\\d+m ago|Just now/')).toBeVisible();
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

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('@special');

    await expect(page.locator('.card')).toHaveCount(1);
    await expect(page.locator('text=@special #characters')).toBeVisible();
  });

  test('should handle whitespace-only search query', async ({ page }) => {
    await page.goto('/');
    await waitForMessagesLoaded(page);

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('   '); // Only whitespace

    // Should show all messages (whitespace is trimmed)
    await expect(page.locator('.card')).toHaveCount(mockMessages.length);
  });
});
