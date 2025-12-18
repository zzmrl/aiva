import { PUBLIC_API_HOST } from '$env/static/public';

export type Message = {
  id: number;
  receiver: string;
  sender: string;
  body: string;
  created: Date;
};

const apiHost = PUBLIC_API_HOST ?? 'http://localhost:3000';

export async function getMessages(): Promise<Message[]> {
  const response = await fetch(`${apiHost}/messages`);

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }

  return response.json();
}
