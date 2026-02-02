import type { Page } from '@playwright/test';
import type { Message } from '../src/lib/api';

/**
 * Mock messages for testing
 */
export const mockMessages: Message[] = [
  {
    id: 1,
    sender: '5551234567',
    receiver: '5550000000',
    body: 'Hello, this is a test message',
    created: new Date('2024-01-15T10:30:00Z'),
  },
  {
    id: 2,
    sender: '5559876543',
    receiver: '5550000000',
    body: 'Another message with different content',
    created: new Date('2024-01-14T15:45:00Z'),
  },
  {
    id: 3,
    sender: '5551234567',
    receiver: '5550000000',
    body: 'Message from the same number',
    created: new Date('2024-01-13T09:20:00Z'),
  },
  {
    id: 23754,
    sender: '8258876333',
    receiver: '5550000000',
    body: 'Message that has a unique identifier',
    created: new Date('2024-01-24T15:45:00Z'),
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
 *
 * Either messages appear, empty state, or error
 */
export async function waitForMessagesLoaded(page: Page) {
  await Promise.race([
    page.getByRole('article').first().waitFor({ state: 'visible' }),
    page.getByText('No messages yet').waitFor({ state: 'visible' }),
    page.getByRole('alert').waitFor({ state: 'visible' }),
  ]);
}
