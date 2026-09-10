import { logger } from "../services";
import { Mutex } from "../utils";
import { Executor } from "./executor";
import { state } from "./state";

export type AccumulatorOptions = {
  chunksSize: number;
  startShares: number;
  sharesLimit: number;
  roundStartMs: number;
  minAssetCost: number;
}

export class Accumulator {
  private readonly chunksSize: number;
  private readonly startShares: number;
  private readonly sharesLimit: number;
  private readonly minAssetCost: number;
  private readonly roundStartMs: number;

  constructor (options: AccumulatorOptions, private readonly executor: Executor) {
    this.chunksSize = options.chunksSize;
    this.startShares = options.startShares;
    this.sharesLimit = options.sharesLimit;
    this.minAssetCost = options.minAssetCost;
    this.roundStartMs = options.roundStartMs;
  }

  private isSpreadReached(askPrice: number, spread: number): boolean {
    if (!spread) return false;
    const remainder = askPrice % spread;
    return remainder < 0.005 || spread - remainder < 0.005;
  }

  public async accumulateOpposite(mutex: Mutex): Promise<void> {
    if (mutex.isLocked()) return;

    const { leader } = state;

    const oppositeAsset = state.getOppositeAsset(leader);

    const oppositeQty = state.getQty(oppositeAsset);
    const oppositeAskPrice = state.getAskPrice(oppositeAsset);
    const oppositeLastBuyPrice = state.getLastBuyPrice(oppositeAsset);

    if (oppositeAskPrice >= 0.30) return;

    const lastBuyDelta = Math.abs(oppositeAskPrice - oppositeLastBuyPrice);

    if (!!oppositeLastBuyPrice && lastBuyDelta <= 0.03) return;

    let shares = 0;

    if (oppositeAskPrice <= 0.30) shares = this.startShares + (oppositeQty * 0.05);
    if (oppositeAskPrice >= 0.25) shares = this.startShares + (oppositeQty * 0.15);
    if (oppositeAskPrice >= 0.20) shares = this.startShares + (oppositeQty * 0.25);

    const executionPrice = this.executor.getExecutionPrice(oppositeAskPrice);
    const limitAdjustedShares = Math.min(shares, this.sharesLimit);
    const assetCost = limitAdjustedShares * executionPrice;

    if (assetCost < this.minAssetCost) return;
    if (limitAdjustedShares <= 0) return;

    logger.info(`═════════════ ACCUMULATE OPPOSITE: ${oppositeAsset}, shares - ${limitAdjustedShares.toFixed(2)}, ask - ${oppositeAskPrice.toFixed(2)}, lastBuy - ${oppositeLastBuyPrice.toFixed(2)} ═════════════`);
    await this.executor.buyAssetInChunks(oppositeAsset, limitAdjustedShares, this.chunksSize, mutex);
  }
}
