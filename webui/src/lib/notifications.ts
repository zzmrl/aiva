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

  function connect() {
    if (closed) {
      return;
    }
    ws = new WebSocket('/notifications');

    ws.addEventListener('open', function open() {
      console.debug('connection open');
      retryDelay = 1000;
    });

    ws.addEventListener('message', function message(e) {
      console.debug('message received');
      try {
        const event = JSON.parse(e.data) as NotificationEvent;
        onEvent(event);
      } catch {
        // ignore malformed messages
      }
    });

    ws.addEventListener('close', function close() {
      console.debug('closed');
      if (!closed) {
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      }
    });

    ws.addEventListener('error', function error(err) {
      console.error({ err });
      ws?.close();
    });
  }

  connect();

  return () => {
    closed = true;
    if (retryTimer !== null) clearTimeout(retryTimer);
    ws?.close();
  };
}
