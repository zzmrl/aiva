import { PUBLIC_API_HOST } from '$env/static/public';

export type Message = {
  id: number;
  phoneNumber: string;
  body: string;
  createdAt: Date;
};

const apiHost = PUBLIC_API_HOST;

export async function getMessages(): Promise<Message[]> {
  const response = await fetch(`${apiHost}/messages`);
  return response.json();
}
