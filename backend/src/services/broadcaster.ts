import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  staffId?: string;
}

class Broadcaster {
  private clients: SSEClient[] = [];

  addClient(id: string, res: Response, staffId?: string) {
    this.clients.push({ id, res, staffId });
    console.log(`📡 SSE client connected [${id}], staffId: ${staffId || 'none'}. Total clients: ${this.clients.length}`);

    // Send immediate handshake
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId: id, timestamp: new Date().toISOString() })}\n\n`);
  }

  removeClient(id: string) {
    this.clients = this.clients.filter(c => c.id !== id);
    console.log(`📡 SSE client disconnected [${id}]. Remaining clients: ${this.clients.length}`);
  }

  broadcast(eventType: string, data: any, targetStaffId?: string) {
    const payload = JSON.stringify({
      type: eventType,
      data,
      targetStaffId,
      timestamp: new Date().toISOString()
    });

    for (const client of this.clients) {
      if (!targetStaffId || client.staffId === targetStaffId || !client.staffId) {
        try {
          client.res.write(`data: ${payload}\n\n`);
        } catch (err) {
          console.error(`Failed to send SSE to client ${client.id}:`, err);
        }
      }
    }
  }
}

export const sseBroadcaster = new Broadcaster();
