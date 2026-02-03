import type { Page } from '@playwright/test';
import type { Message, Conversation } from '../src/lib/api';

/**
 * Mock conversations for testing
 */
export const mockConversations: Conversation[] = [
  {
    phone1: '5550000000',
    phone2: '5551234567',
    last_message_body: 'Hello, this is a test message',
    last_message_sender: '5551234567',
    last_message_at: '2024-01-15T10:30:00Z',
    contact_phone: '5551234567',
  },
  {
    phone1: '5550000000',
    phone2: '5559876543',
    last_message_body: 'Another message with different content',
    last_message_sender: '5559876543',
    last_message_at: '2024-01-14T15:45:00Z',
    contact_phone: '5559876543',
  },
  {
    phone1: '5550000000',
    phone2: '8258876333',
    last_message_body: 'Message that has a unique identifier',
    last_message_sender: '8258876333',
    last_message_at: '2024-01-24T15:45:00Z',
    contact_phone: '8258876333',
  },
];

/**
 * Mock messages for a conversation between system and 5551234567
 */
export const mockConversationMessages: Message[] = [
  {
    id: 1,
    sender: '5551234567',
    receiver: '5550000000',
    body: 'Hello, this is a test message',
    direction: 'inbound',
    created: new Date('2024-01-15T10:30:00Z'),
  },
  {
    id: 2,
    sender: '5550000000',
    receiver: '5551234567',
    body: 'Hi! How can I help you?',
    direction: 'outbound',
    created: new Date('2024-01-15T10:31:00Z'),
  },
  {
    id: 3,
    sender: '5551234567',
    receiver: '5550000000',
    body: 'Message from the same number',
    direction: 'inbound',
    created: new Date('2024-01-15T10:32:00Z'),
  },
];

/**
 * Mock messages for testing (kept for backward compat)
 */
export const mockMessages: Message[] = [
  {
    id: 1,
    sender: '5551234567',
    receiver: '5550000000',
    body: 'Hello, this is a test message',
    direction: 'inbound',
    created: new Date('2024-01-15T10:30:00Z'),
  },
  {
    id: 2,
    sender: '5559876543',
    receiver: '5550000000',
    body: 'Another message with different content',
    direction: 'inbound',
    created: new Date('2024-01-14T15:45:00Z'),
  },
  {
    id: 3,
    sender: '5551234567',
    receiver: '5550000000',
    body: 'Message from the same number',
    direction: 'inbound',
    created: new Date('2024-01-13T09:20:00Z'),
  },
  {
    id: 23754,
    sender: '8258876333',
    receiver: '5550000000',
    body: 'Message that has a unique identifier',
    direction: 'inbound',
    created: new Date('2024-01-24T15:45:00Z'),
  },
];

/**
 * Set up API route interception with mock conversations and messages
 */
export async function setupMockApi(
  page: Page,
  conversations: Conversation[] = mockConversations,
  messages: Message[] = mockConversationMessages,
) {
  await page.route('**/messages/conversations', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(conversations),
    });
  });

  await page.route('**/messages?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(messages),
    });
  });

  await page.route('**/messages', async (route) => {
    const url = route.request().url();
    if (url.includes('conversations') || url.includes('?')) return;
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
  await page.route('**/messages/conversations', async (route) => {
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
  await page.route('**/messages/conversations', async (route) => {
    await route.abort('failed');
  });
}

/**
 * Wait for conversations to finish loading
 */
export async function waitForConversationsLoaded(page: Page) {
  await Promise.race([
    page.getByRole('list', { name: 'Conversations' }).waitFor({ state: 'visible' }),
    page.getByText('No conversations yet.').waitFor({ state: 'visible' }),
    page.getByRole('alert').waitFor({ state: 'visible' }),
  ]);
}
