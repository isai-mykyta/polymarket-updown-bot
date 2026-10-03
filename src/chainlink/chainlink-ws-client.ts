import { HOSTS } from "../constants";
import { logger, WsClient } from "../services";
import { ChainlinkMessage, ChainlinkSnapshotMessage, ChainlinkSymbol, ChainlinkUpdateMessage, ChainlinkWsClientOptions } from "./types";

// Chainlink Data Streams prices via Polymarket RTDS - the same feed up/down markets resolve against
export class ChainlinkWsClient extends WsClient {
  private reconnectInProgress = false;
  private lastReconnectMs = 0;

  private readonly reconnectCooldownMs = 10_000;
  private readonly topic = "crypto_prices_chainlink";

  constructor (options: ChainlinkWsClientOptions) {
    super({
      baseUrl: `${HOSTS.POLYMARKET_RTDS_WS_CLIENT}`,
      pingIntervalInSeconds: 5,
      onMessage: options.onMessage,
      onConnect: () => this.handleConnect(options),
    });
  }

  private handleConnect(options: Pick<ChainlinkWsClientOptions, "onConnect">): void {
    options.onConnect?.();
  }

  private buildSubscriptions(symbols: ChainlinkSymbol[]): Record<string, unknown>[] {
    return symbols.map((symbol) => ({ topic: this.topic, type: "*", filters: JSON.stringify({ symbol }) }));
  }

  public subscribe(symbols: ChainlinkSymbol[]): void {
    super.send(JSON.stringify({ action: "subscribe", subscriptions: this.buildSubscriptions(symbols) }));
  }

  public unsubscribe(symbols: ChainlinkSymbol[]): void {
    super.send(JSON.stringify({ action: "unsubscribe", subscriptions: this.buildSubscriptions(symbols) }));
  }

  public static isUpdate(msg: ChainlinkMessage): msg is ChainlinkUpdateMessage {
    return msg?.topic === "crypto_prices_chainlink" && msg?.type === "update";
  }

  public static isSnapshot(msg: ChainlinkMessage): msg is ChainlinkSnapshotMessage {
    return msg?.type === "subscribe" && Array.isArray((msg as ChainlinkSnapshotMessage)?.payload?.data);
  }

  public async reconnectWs(reason: string): Promise<void> {
    const now = Date.now();

    if (this.reconnectInProgress) return;
    if (now - this.lastReconnectMs < this.reconnectCooldownMs) return;

    this.reconnectInProgress = true;
    this.lastReconnectMs = now;

    try {
      logger.warn(`Reconnecting Chainlink WS Client: ${reason}`);
      await this.reconnect();
    } catch (err) {
      logger.warn(`Chainlink WS Client reconnect failed: ${err}`);
    } finally {
      this.reconnectInProgress = false;
    }
  }
}
