type Listener = (...args: any[]) => void;

export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  url: string;
  readyState = 0;
  onopen: Listener | null = null;
  onclose: Listener | null = null;
  onmessage: Listener | null = null;
  onerror: Listener | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code = 1000): void {
    this.readyState = this.CLOSED;
    this.onclose?.({ code });
  }

  simulateOpen(): void {
    this.readyState = this.OPEN;
    this.onopen?.();
  }

  simulateMessage(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}
