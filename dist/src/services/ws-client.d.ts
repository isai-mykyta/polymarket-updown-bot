import { WebSocket } from "ws";
type WsClientOptions<D = any, M = any> = {
    baseUrl: string;
    pingIntervalInSeconds: number;
    onConnect?: (data?: D) => void;
    onMessage?: (message?: M) => void;
};
export declare abstract class WsClient {
    protected readonly baseUrl: string;
    protected readonly pingIntervalInSeconds: number;
    private readonly onConnect?;
    private readonly onCustomMessage?;
    protected ws: WebSocket;
    private autoReconnect;
    private connectionState;
    private pingTimeout;
    constructor(options: WsClientOptions);
    private onError;
    private clearPingTimeout;
    private schedulePing;
    private ping;
    private onOpen;
    private onMessage;
    private onClose;
    private attemptReconnect;
    private cleanup;
    protected send(msg: string): void;
    connect(): Promise<void>;
    reconnect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}
export {};
