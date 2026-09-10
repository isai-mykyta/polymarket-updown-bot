import { ClobApiClient } from "../clob";
import { Mutex } from "../utils";
import { AssetType } from "./types";
export type ExecutorOptions = {
    priceBuffer: number;
    downTokenId: string;
    testMode: boolean;
    upTokenId: string;
    feeRate: number;
};
export declare class Executor {
    private readonly clobApiClient;
    private readonly downTokenId;
    private readonly priceBuffer;
    private readonly testMode;
    private readonly upTokenId;
    private readonly feeRate;
    constructor(options: ExecutorOptions, clobApiClient: ClobApiClient);
    isValidCombinedAskPrice(): boolean;
    getExecutionPrice(price: number): number;
    buyAssetInChunks(asset: AssetType, totalShares: number, chunkSize: number, mutex: Mutex, retryUntilSuccess?: boolean): Promise<void>;
    buyAsset(asset: AssetType, price: number, targetShares: number): Promise<void>;
}
