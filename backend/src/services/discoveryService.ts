import dgram from 'dgram';

export class DiscoveryService {
  private static socket: dgram.Socket | null = null;

  public static start(discoveryPort: number = 5001, httpPort: number = 5000) {
    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('message', (msg, rinfo) => {
        const text = msg.toString().trim();
        if (text.includes('FPM_DISCOVER')) {
          const response = Buffer.from(`FPM_SERVER_INFO:${httpPort}`);
          this.socket?.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
            if (!err) {
              console.log(`[DISCOVERY] Discovered by mobile client at ${rinfo.address}:${rinfo.port}`);
            }
          });
        }
      });

      this.socket.on('error', (err) => {
        console.warn('[DISCOVERY ERROR]', err.message);
      });

      this.socket.bind(discoveryPort, '0.0.0.0', () => {
        console.log(`[DISCOVERY] UDP Auto-Discovery responder active on 0.0.0.0:${discoveryPort}`);
      });
    } catch (e: any) {
      console.warn('[DISCOVERY] Could not bind UDP socket:', e.message);
    }
  }

  public static stop() {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (_) {}
      this.socket = null;
    }
  }
}
