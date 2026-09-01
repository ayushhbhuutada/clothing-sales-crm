type SSECallback = (data: any) => void;

class SSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<SSECallback>> = new Map();
  private isConnecting = false;
  private currentStaffId: string | null = null;

  connect(staffId?: string) {
    if (this.currentStaffId === staffId && this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    this.currentStaffId = staffId || null;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    const baseUrl = import.meta.env.VITE_API_URL || '';
    const url = staffId ? `${baseUrl}/api/events?staffId=${staffId}` : `${baseUrl}/api/events`;
    this.isConnecting = true;

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
        this.isConnecting = false;
        // EventSource will automatically attempt to reconnect
      };

      this.eventSource.onopen = () => {
        this.isConnecting = false;
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      this.isConnecting = false;
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
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.currentStaffId = null;
  }
}

export const sseService = new SSEService();
