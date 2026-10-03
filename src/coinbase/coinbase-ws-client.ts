import { HOSTS } from "../constants";
import { logger, WsClient } from "../services";
import { CoinbaseWsClientOptions } from "./types";

export class CoinbaseWsClient extends WsClient {
  private reconnectInProgress = false;
  private lastReconnectMs = 0;

  private readonly reconnectCooldownMs = 10_000;

  constructor (options: CoinbaseWsClientOptions) {
    super({
      baseUrl: `${HOSTS.COINBASE_WS_CLIENT}`,
      pingIntervalInSeconds: 5,
      onMessage: options.onMessage,
      onConnect: () => this.handleConnect(options),
    });
  }

  private handleConnect(options: Pick<CoinbaseWsClientOptions, "onConnect">): void {
    options.onConnect?.();
  }

  public subscribe(options: Record<string, unknown>): void {
    super.send(JSON.stringify({ type: "subscribe", ...options }));
  }

  public unsubscribe(options: Record<string, unknown>): void {
    super.send(JSON.stringify({ type: "unsubscribe", ...options }));
  }

  public async reconnectWs(reason: string): Promise<void> {
    const now = Date.now();
    
    if (this.reconnectInProgress) return;
    if (now - this.lastReconnectMs < this.reconnectCooldownMs) return;
    
    this.reconnectInProgress = true;
    this.lastReconnectMs = now;
    
    try {
      logger.warn(`Reconnecting Coinbase WS Client: ${reason}`);
      await this.reconnect();
    } catch (err) {
      logger.warn(`Coinbase WS Client reconnect failed: ${err}`);
    } finally {
      this.reconnectInProgress = false;
    }
  }
}
