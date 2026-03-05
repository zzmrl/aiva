export type Direction = 'inbound' | 'outbound';

export type Message = {
  id: number;
  receiver: string;
  sender: string;
  body: string;
  direction: Direction;
  created: Date;
};

export type Conversation = {
  phone1: string;
  phone2: string;
  last_message_body: string;
  last_message_sender: string;
  last_message_at: string;
  contact_phone: string;
};

export async function getMessages(phone?: string): Promise<Message[]> {
  const url = new URL('/messages');
  if (phone) {
    url.searchParams.append('phone', encodeURIComponent(phone));
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }

  return response.json();
}

export async function getConversations(): Promise<Conversation[]> {
  const response = await fetch(`/messages/conversations`);

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.status}`);
  }

  return response.json();
}
