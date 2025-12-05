import type { Page } from '@playwright/test';
import type { Message } from '../src/lib/api';

/**
 * Mock messages for testing
 */
export const mockMessages: Message[] = [
  {
    id: 1,
    phoneNumber: '5551234567',
    body: 'Hello, this is a test message',
    createdAt: new Date('2024-01-15T10:30:00Z'),
  },
  {
    id: 2,
    phoneNumber: '5559876543',
    body: 'Another message with different content',
    createdAt: new Date('2024-01-14T15:45:00Z'),
  },
  {
    id: 3,
    phoneNumber: '5551234567',
    body: 'Message from the same number',
    createdAt: new Date('2024-01-13T09:20:00Z'),
  },
];

/**
 * Set up API route interception with mock messages
 */
export async function setupMockApi(page: Page, messages: Message[] = mockMessages) {
  await page.route('**/messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(messages),
    });
  });
}

/**
 * Set up API route to return an error
 */
export async function setupMockApiError(page: Page, status: number = 500) {
  await page.route('**/messages', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' }),
    });
  });
}

/**
 * Set up API route to simulate network failure
 */
export async function setupMockApiFailure(page: Page) {
  await page.route('**/messages', async (route) => {
    await route.abort('failed');
  });
}

/**
 * Wait for messages to finish loading
 */
export async function waitForMessagesLoaded(page: Page) {
  // Wait for loading spinner to disappear or messages to appear
  await Promise.race([
    page.waitForSelector('.card', { state: 'visible' }),
    page.waitForSelector('text=No messages yet'),
    page.waitForSelector('.alert-error'),
  ]);
}
