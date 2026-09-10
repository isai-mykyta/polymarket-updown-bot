import { HOSTS } from "../constants";
import { WsClient } from "../services";

const { CLOB_WS_URL } = HOSTS;

type ClobWsClientOptions = {
  path: string;
  onConnect?: (data?: any) => void;
  onMessage?: (message?: any) => void;
}

abstract class ClobWsClient extends WsClient {
  private lastSubscription: Record<string, unknown> | null = null;

  constructor (options: ClobWsClientOptions) {
    super({
      baseUrl: `${CLOB_WS_URL}${options.path}`,
      pingIntervalInSeconds: 5,
      onMessage: options.onMessage,
      onConnect: () => this.handleConnect(options),
    });
  }

  private handleConnect(options: Pick<ClobWsClientOptions, "onConnect">): void {
    if (this.lastSubscription) this.subscribe(this.lastSubscription);
    options.onConnect?.();
  }

  public subscribe(options: Record<string, unknown>): void {
    this.lastSubscription = options;
    super.send(JSON.stringify({ operation: "subscribe", ...options }));
  }

  public unsubscribe(options: Record<string, unknown>): void {
    super.send(JSON.stringify({ action: "unsubscribe", ...options }));
  }
}

export class MarketClobWsClient extends ClobWsClient {
  constructor (options: Omit<ClobWsClientOptions, "path">) {
    super({
      path: "/market",
      onConnect: options.onConnect,
      onMessage: options.onMessage,
    });
  }
}
