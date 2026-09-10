import { WsClient } from "../services";
import { BinanceWsClientOptions } from "./types";
export declare class BinanceWsClient extends WsClient {
    private reconnectInProgress;
    private lastReconnectMs;
    private readonly reconnectCooldownMs;
    constructor(options: BinanceWsClientOptions);
    private handleConnect;
    subscribe(options: Record<string, unknown>): void;
    unsubscribe(options: Record<string, unknown>): void;
    reconnectWs(reason: string): Promise<void>;
}
