import { expect, test } from '@playwright/test';
import {
  mockConversations,
  mockConversationMessages,
  setupMockApi,
  setupMockApiError,
  setupMockApiFailure,
  waitForConversationsLoaded,
} from './test-helpers';

test.describe('Chat UI Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('should load and display conversation list', async ({ page }) => {
    await page.goto('/');
    await waitForConversationsLoaded(page);

    const list = page.getByRole('list', { name: 'Conversations' });
    await expect(list).toBeVisible();

    // Should show contact phone numbers (not the system phone)
    await expect(page.getByText('(555) 123-4567')).toBeVisible();
    await expect(page.getByText('(555) 987-6543')).toBeVisible();
    await expect(page.getByText('(825) 887-6333')).toBeVisible();
  });

  test('should show last message preview in conversation list', async ({ page }) => {
    await page.goto('/');
    await waitForConversationsLoaded(page);

    await expect(page.getByText('Hello, this is a test message')).toBeVisible();
    await expect(page.getByText('Another message with different content')).toBeVisible();
  });

  test('should show chat view when selecting a conversation', async ({ page }) => {
    await page.goto('/');
    await waitForConversationsLoaded(page);

    await page.getByText('(555) 123-4567').click();

    // Should show the chat view with messages
    await expect(page.getByText('Hi! How can I help you?')).toBeVisible();
    await expect(page.getByText('Message from the same number')).toBeVisible();
  });

  test('should render outgoing messages differently from incoming', async ({ page }) => {
    await page.goto('/');
    await waitForConversationsLoaded(page);

    await page.getByText('(555) 123-4567').click();

    // Wait for chat bubbles to appear
    await expect(page.getByText('Hi! How can I help you?')).toBeVisible();

    // Outgoing message (from system phone) should have chat-end class
    const outgoingBubble = page.locator('.chat-end');
    await expect(outgoingBubble).toHaveCount(1);
    await expect(outgoingBubble).toContainText('Hi! How can I help you?');

    // Incoming messages should have chat-start class
    const incomingBubbles = page.locator('.chat-start');
    await expect(incomingBubbles).toHaveCount(2);
  });

  test('should show back button on mobile to return to conversation list', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await waitForConversationsLoaded(page);

    // Select a conversation
    await page.getByText('(555) 123-4567').click();

    // Back button should be visible on mobile
    const backButton = page.getByRole('button', { name: 'Back to conversations' });
    await expect(backButton).toBeVisible();

    // Click back to return to conversation list
    await backButton.click();

    // Should show conversation list again
    await expect(page.getByRole('list', { name: 'Conversations' })).toBeVisible();
  });

  test('should search/filter conversations by phone number', async ({ page }) => {
    await page.goto('/');
    await waitForConversationsLoaded(page);

    const searchInput = page.getByRole('searchbox', { name: 'Search conversations' });
    await searchInput.fill('1234567');

    // Should only show matching conversation
    await expect(page.getByText('(555) 123-4567')).toBeVisible();
    await expect(page.getByText('(555) 987-6543')).not.toBeVisible();
  });

  test('should display empty state when no conversations', async ({ page }) => {
    await setupMockApi(page, [], []);

    await page.goto('/');
    await waitForConversationsLoaded(page);

    await expect(page.getByText('No conversations yet.')).toBeVisible();
  });

  test('should display error state when API fails', async ({ page }) => {
    await setupMockApiError(page, 500);

    await page.goto('/');
    await waitForConversationsLoaded(page);

    await expect(
      page.getByText('Something went wrong loading messages. Please try again later.'),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('should display error state when API is unreachable', async ({ page }) => {
    await setupMockApiFailure(page);

    await page.goto('/');
    await waitForConversationsLoaded(page);

    await expect(
      page.getByText('Something went wrong loading messages. Please try again later.'),
    ).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // Delay the API response to see loading state
    await page.route('**/messages/conversations', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockConversations),
      });
    });

    await page.goto('/');

    // Should show loading spinner initially
    await expect(page.getByRole('status', { name: 'Loading conversations' })).toBeVisible();
  });

  test('should show select conversation placeholder on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto('/');
    await waitForConversationsLoaded(page);

    await expect(page.getByText('Select a conversation')).toBeVisible();
  });

  test('should display messages in chronological order (oldest first)', async ({ page }) => {
    await page.goto('/');
    await waitForConversationsLoaded(page);

    await page.getByText('(555) 123-4567').click();

    // Wait for chat to load
    await expect(page.getByText('Hi! How can I help you?')).toBeVisible();

    // Messages are returned DESC from API and reversed for display
    // So order should be: test message, help response, same number
    const bubbles = page.locator('.chat-bubble');
    await expect(bubbles).toHaveCount(mockConversationMessages.length);

    await expect(bubbles.nth(0)).toContainText('Message from the same number');
    await expect(bubbles.nth(1)).toContainText('Hi! How can I help you?');
    await expect(bubbles.nth(2)).toContainText('Hello, this is a test message');
  });

  test('should show contact phone in conversation header', async ({ page }) => {
    await page.goto('/');
    await waitForConversationsLoaded(page);

    await page.getByText('(555) 123-4567').click();

    // Header should show the formatted contact phone
    const header = page.locator('h2');
    await expect(header).toContainText('(555) 123-4567');
  });
});
