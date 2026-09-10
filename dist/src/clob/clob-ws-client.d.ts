import { WsClient } from "../services";
type ClobWsClientOptions = {
    path: string;
    onConnect?: (data?: any) => void;
    onMessage?: (message?: any) => void;
};
declare abstract class ClobWsClient extends WsClient {
    private lastSubscription;
    constructor(options: ClobWsClientOptions);
    private handleConnect;
    subscribe(options: Record<string, unknown>): void;
    unsubscribe(options: Record<string, unknown>): void;
}
export declare class MarketClobWsClient extends ClobWsClient {
    constructor(options: Omit<ClobWsClientOptions, "path">);
}
export {};
