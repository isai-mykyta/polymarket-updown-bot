import { ClobClient } from "@polymarket/clob-client-v2";
import { UserMarketOrder } from "./types";
export declare class ClobApiClient {
    private clobClient;
    initClobClient(): Promise<void>;
    getPolymarketClient(): Promise<ClobClient>;
    createMarketOrder(order: UserMarketOrder): Promise<any>;
}
