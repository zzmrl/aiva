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

function filterParams(obj: Record<string, string | undefined>): URLSearchParams {
  const filtered = Object.entries(obj).filter(([, v]) => v);
  return new URLSearchParams(filtered as string[][]);
}

export async function getSystemPhones(): Promise<string[]> {
  const response = await fetch('/messages/system-phones');
  if (!response.ok) {
    throw new Error(`Failed to fetch system phones: ${response.status}`);
  }
  return response.json();
}

export async function getMessages(phone?: string, systemPhone?: string): Promise<Message[]> {
  const params = filterParams({ phone, systemPhone });
  const response = await fetch(`/messages${params.size ? `?${params}` : ''}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }
  return response.json();
}

export async function getConversations(systemPhone?: string): Promise<Conversation[]> {
  const params = filterParams({ systemPhone });
  const response = await fetch(`/messages/conversations${params.size ? `?${params}` : ''}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.status}`);
  }
  return response.json();
}
