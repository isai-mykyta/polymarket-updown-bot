import { ClobApiClient } from "../clob";
import { Mutex } from "../utils";
import { AssetType } from "./types";
export type TraderOptions = {
    feeRate: number;
    priceBuffer: number;
};
export declare class Trader {
    private readonly clobApiClient;
    private readonly feeRate;
    private readonly priceBuffer;
    constructor(options: TraderOptions, clobApiClient: ClobApiClient);
    private isValidCombinedAskPrice;
    private getExecutionPrice;
    private buyAssetInChunks;
    private buyAsset;
    trade(asset: AssetType, mutex: Mutex): Promise<void>;
}
