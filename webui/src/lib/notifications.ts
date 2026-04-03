import type { Message } from './api';

export type NewMessageEvent = {
  type: 'new_message';
  message: Message;
};

export type NotificationEvent = NewMessageEvent;

type Handler = (event: NotificationEvent) => void;

export function connectNotifications(onEvent: Handler): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let retryDelay = 1000;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function getUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/notifications`;
  }

  function connect() {
    if (closed) return;
    ws = new WebSocket(getUrl());

    ws.onopen = () => {
      retryDelay = 1000;
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as NotificationEvent;
        onEvent(event);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!closed) {
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  connect();

  return () => {
    closed = true;
    if (retryTimer !== null) clearTimeout(retryTimer);
    ws?.close();
  };
}
