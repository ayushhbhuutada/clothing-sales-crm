import { api } from './api';

type SSECallback = (data: any) => void;

const RECONNECT_DELAY_MS = 3000;

class SSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<SSECallback>> = new Map();
  private currentStaffId: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Requires a logged-in session: the stream is opened with a short-lived ticket, never the session token
  async connect(staffId: string) {
    if (this.currentStaffId === staffId && this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return;
    }

    this.closeStream();
    this.currentStaffId = staffId;

    let ticket: string;
    try {
      ticket = await api.getSseTicket();
    } catch (err) {
      console.error('Failed to get live updates ticket:', err);
      this.scheduleReconnect(staffId);
      return;
    }

    // A newer connect/disconnect happened while the ticket was being fetched
    if (this.currentStaffId !== staffId) return;

    const baseUrl = import.meta.env.VITE_API_URL || '';
    const url = `${baseUrl}/api/events?ticket=${encodeURIComponent(ticket)}`;

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const type = payload.type;
          const data = payload.data;

          if (this.listeners.has(type)) {
            this.listeners.get(type)?.forEach(cb => cb(data));
          }

          if (this.listeners.has('*')) {
            this.listeners.get('*')?.forEach(cb => cb(payload));
          }
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };

      this.eventSource.onerror = () => {
        // EventSource retries on its own, but gives up (CLOSED) once the ticket has expired; get a fresh one
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.scheduleReconnect(staffId);
        }
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      this.scheduleReconnect(staffId);
    }
  }

  private scheduleReconnect(staffId: string) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.currentStaffId === staffId) {
        this.currentStaffId = null;
        this.connect(staffId);
      }
    }, RECONNECT_DELAY_MS);
  }

  private closeStream() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  on(event: string, callback: SSECallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  off(event: string, callback: SSECallback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.delete(callback);
    }
  }

  disconnect() {
    this.closeStream();
    this.currentStaffId = null;
  }
}

export const sseService = new SSEService();
