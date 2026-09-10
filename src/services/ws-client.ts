import { WebSocket } from "ws";

import { logger } from "./logger";

type WsClientOptions<D = any, M = any> = {
  baseUrl: string;
  pingIntervalInSeconds: number;
  onConnect?: (data?: D) => void;
  onMessage?: (message?: M) => void;
}

enum ConnectionState {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  RECONNECTING = "RECONNECTING"
}

export abstract class WsClient {
  protected readonly baseUrl: string;
  protected readonly pingIntervalInSeconds: number;

  private readonly onConnect?: (data?: any) => void;
  private readonly onCustomMessage?: (message?: any) => void;

  protected ws: WebSocket;

  private autoReconnect: boolean = true;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private pingTimeout: NodeJS.Timeout | null = null;

  constructor (options: WsClientOptions) {
    this.baseUrl = options.baseUrl;
    this.pingIntervalInSeconds = options.pingIntervalInSeconds;

    this.onConnect = options.onConnect;
    this.onCustomMessage = options.onMessage;
  }

  private onError = (err: Error): void => {
    logger.error("WebSocket error", { err: err.message });
  };

  private clearPingTimeout(): void {
    if (!this.pingTimeout) return;
    clearTimeout(this.pingTimeout);
    this.pingTimeout = null;
  }

  private schedulePing(): void {
    this.clearPingTimeout();

    this.pingTimeout = setTimeout(() => {
      this.ping();
      this.schedulePing();
    }, this.pingIntervalInSeconds * 1000);
  }

  private ping(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn(`Socket not open. Ready state is: ${this.ws?.readyState}`);
      return;
    }
  
    this.ws.ping((err: Error | undefined) => {
      if (err) logger.error("ping error", { err });
    });
  }

  private onOpen = (): void => {
    this.connectionState = ConnectionState.CONNECTED;
    this.schedulePing();
    logger.info("WebSocket connected");
    this.onConnect?.();
  };

  private onMessage = (data: Buffer | string): void => {
    const text = typeof data === "string" ? data : data.toString("utf8");
    if (!text) return;

    let msg: any;

    try {
      msg = JSON.parse(text);
    } catch (e) {
      logger.warn("Non-JSON frame received", { data: text });
      return;
    }

    this.onCustomMessage?.(msg);
  };

  private onClose = (code: number, reason: Buffer): void => {
    const reasonText = reason.toString("utf8");
    logger.warn("WebSocket disconnected", { code, reason: reasonText, autoReconnect: this.autoReconnect });

    this.cleanup();
    this.autoReconnect ? this.attemptReconnect() : this.connectionState = ConnectionState.DISCONNECTED;
  };

  private attemptReconnect(): void {
    logger.warn(`WebSocket reconnecting...`);
    
    if (this.connectionState === ConnectionState.RECONNECTING) return;

    this.connectionState = ConnectionState.RECONNECTING;
    const delay = Math.min(1000 * Math.pow(2, 1), 30000);
    logger.info(`Attempting reconnection in ${delay}ms`);

    setTimeout(() => {
      if (this.connectionState === ConnectionState.RECONNECTING) this.connect();
    }, delay);
  }

  private cleanup(): void {
    this.clearPingTimeout();
    if (!this.ws) return;
    this.ws.removeAllListeners();
    this.ws = null;
  }

  protected send(msg: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error(`Socket not open. Ready state is: ${this.ws?.readyState ?? "null"}`);
    this.ws.send(msg, (err?: Error) => err ? logger.error("send error", { err, msg }) : logger.debug("Message sent", { msg }));
  }

  public async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.connectionState === ConnectionState.CONNECTING || this.connectionState === ConnectionState.CONNECTED) {
        reject(new Error("Already connected or connecting"));
        return;
      }

      this.connectionState = ConnectionState.CONNECTING;
      this.cleanup();

      try {
        this.ws = new WebSocket(this.baseUrl);

        this.ws.on("open", () => this.onOpen());
        this.ws.on("message", (data: any) => this.onMessage(data));
        this.ws.on("close", (code, reason) => this.onClose(code, reason));
        this.ws.on("error", (err) => this.onError(err));
        this.ws.once("open", () => resolve());
      } catch (err) {
        logger.error("Failed to create WebSocket", { err });
        this.connectionState = ConnectionState.DISCONNECTED;
        reject(new Error("Failed to create WebSocket"));
      }
    });
  }

  public async reconnect(): Promise<void> {
    logger.warn("Forcing WebSocket reconnection...");
    this.clearPingTimeout();

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) this.ws.terminate();
      this.ws = null;
    }

    this.connectionState = ConnectionState.DISCONNECTED;
    await this.connect();
  }

  public async disconnect(): Promise<void> {
    logger.info("Manually disconnecting WebSocket");

    this.autoReconnect = false;
    this.connectionState = ConnectionState.DISCONNECTED;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return new Promise<void>((resolve) => {
        this.ws.once("close", () => {
          this.cleanup();
          this.autoReconnect = true;
          resolve();
        });
        this.ws.close(1000, "Client disconnect");
      });
    }

    this.cleanup();
  }

  public isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
