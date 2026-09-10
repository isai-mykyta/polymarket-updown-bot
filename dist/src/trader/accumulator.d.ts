import { Mutex } from "../utils";
import { Executor } from "./executor";
export type AccumulatorOptions = {
    chunksSize: number;
    startShares: number;
    sharesLimit: number;
    roundStartMs: number;
    minAssetCost: number;
};
export declare class Accumulator {
    private readonly executor;
    private readonly chunksSize;
    private readonly startShares;
    private readonly sharesLimit;
    private readonly minAssetCost;
    private readonly roundStartMs;
    constructor(options: AccumulatorOptions, executor: Executor);
    private isSpreadReached;
    accumulateOpposite(mutex: Mutex): Promise<void>;
}
