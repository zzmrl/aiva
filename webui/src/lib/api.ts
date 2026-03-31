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

export async function getSystemPhones(): Promise<string[]> {
  const response = await fetch('/messages/system-phones');
  if (!response.ok) {
    throw new Error(`Failed to fetch system phones: ${response.status}`);
  }
  return response.json();
}

export async function getMessages(phone?: string, systemPhone?: string): Promise<Message[]> {
  const params = new URLSearchParams();
  if (phone) params.set('phone', phone);
  if (systemPhone) params.set('systemPhone', systemPhone);
  const qs = params.toString();
  const response = await fetch(`/messages${qs ? `?${qs}` : ''}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }
  return response.json();
}

export async function getConversations(systemPhone?: string): Promise<Conversation[]> {
  const params = new URLSearchParams();
  if (systemPhone) params.set('systemPhone', systemPhone);
  const qs = params.toString();
  const response = await fetch(`/messages/conversations${qs ? `?${qs}` : ''}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.status}`);
  }
  return response.json();
}
