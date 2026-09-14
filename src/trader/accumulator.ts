import { logger } from "../services";
import { Mutex } from "../utils";
import { Executor } from "./executor";
import { state } from "./state";
import { AssetType } from "./types";

export type AccumulatorOptions = {
  chunksSize: number;
  startShares: number;
  sharesLimit: number;
  minAssetCost: number;
}

export class Accumulator {
  private readonly chunksSize: number;
  private readonly startShares: number;
  private readonly sharesLimit: number;
  private readonly minAssetCost: number;

  constructor (options: AccumulatorOptions, private readonly executor: Executor) {
    this.chunksSize = options.chunksSize;
    this.startShares = options.startShares;
    this.sharesLimit = options.sharesLimit;
    this.minAssetCost = options.minAssetCost;
  }

  private isSpreadReached(askPrice: number, spread: number): boolean {
    if (!spread) return false;
    const remainder = askPrice % spread;
    return remainder < 0.005 || spread - remainder < 0.005;
  }

  public async accumulateAsset(mutex: Mutex, asset: AssetType): Promise<void> {
    if (mutex.isLocked()) return;

    const qty = state.getQty(asset);
    const askPrice = state.getAskPrice(asset);
    const lastBuyPrice = state.getLastBuyPrice(asset);

    if (askPrice >= 0.40) return;

    const lastBuyDelta = Math.abs(askPrice - lastBuyPrice);

    if (lastBuyDelta <= 0.02) return;

    let shares = 0;

    if (askPrice <= 0.30) shares = this.startShares + (qty * 0.05);
    if (askPrice <= 0.25) shares = this.startShares + (qty * 0.15);
    if (askPrice <= 0.20) shares = this.startShares + (qty * 0.25);

    const executionPrice = this.executor.getExecutionPrice(askPrice);
    const limitAdjustedShares = Math.min(shares, this.sharesLimit);
    const assetCost = limitAdjustedShares * executionPrice;

    if (assetCost < this.minAssetCost) return;
    if (limitAdjustedShares <= 0) return;

    logger.info(`═════════════ ACCUMULATE ASSET: ${asset}, shares - ${limitAdjustedShares.toFixed(2)}, ask - ${askPrice.toFixed(2)}, lastBuy - ${lastBuyPrice.toFixed(2)} ═════════════`);
    await this.executor.buyAssetInChunks(asset, limitAdjustedShares, this.chunksSize, mutex);
  }
}
