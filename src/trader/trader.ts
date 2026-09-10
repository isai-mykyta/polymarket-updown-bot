import { ClobApiClient, OrderType, Side, UserMarketOrder } from "../clob";
import { logger } from "../services";
import { executeInChunks, Mutex } from "../utils";
import { state } from "./state";
import { AssetType } from "./types";

export type TraderOptions = {
  feeRate: number;
  priceBuffer: number;
}

export class Trader {
  private readonly feeRate: number;
  private readonly priceBuffer: number;

  constructor (options: TraderOptions, private readonly clobApiClient: ClobApiClient) {
    this.feeRate = options.feeRate;
    this.priceBuffer = options.priceBuffer;
  }

  private isValidCombinedAskPrice(): boolean {
    return state.upAskPrice + state.downAskPrice <= 1.05; // .05 as a buffer
  }

  private getExecutionPrice(price: number): number {
    return !Number.isFinite(price) ? price : Math.min(price * this.priceBuffer, 0.99);
  }

  private async buyAssetInChunks(asset: AssetType, totalShares: number, chunkSize: number, mutex: Mutex, retryUntilSuccess: boolean = false): Promise<void> {
    await mutex.runExclusive(async () => {
      logger.info(`📤 Attempt to buy ${totalShares} ${asset} shares in ${chunkSize} chunk size`);
  
      if (!this.isValidCombinedAskPrice()) {
        logger.warn(`❌ Invalid combined ASK price, skipping trade.`);
        return;
      }
  
      await executeInChunks(totalShares, chunkSize, async (size) => {
        const askPrice = state.getAskPrice(asset);
        await this.buyAsset(asset, askPrice, size);
      }, retryUntilSuccess);
  
      logger.info(`✅ All ${totalShares} ${asset} shares bought successfully`);
    });
  }

  private async buyAsset(asset: AssetType, price: number, targetShares: number): Promise<void> {
    const executionPrice = Math.min(price * this.priceBuffer, 0.99);
    const cost = targetShares * executionPrice;
    const tokenID = asset === AssetType.UP ? state.upTokenId : state.downTokenId;
  
    if (targetShares < 1 || cost < 1) return;
        
    const order: UserMarketOrder = {
      tokenID,
      price: executionPrice,
      amount: cost,
      orderType: OrderType.FOK,
      side: Side.BUY
    };
  
    logger.info(`📤 BUY ATTEMPT ${asset}: shares - ${targetShares}, price ${executionPrice.toFixed(2)} = $${cost.toFixed(2)}`);
    let result: any;
  
    if (state.testMode) {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1200)); // simulate network delay
      result = { takingAmount: targetShares, makingAmount: cost };
    } else {
      result = await this.clobApiClient.createMarketOrder(order);
    }
  
    const shares = Number(result.takingAmount);
    const spent = Number(result.makingAmount);
  
    const takerFee = shares * this.feeRate * price * (1 - price);
    const totalCostWithFee = spent + takerFee;
        
    logger.info(`✅ BUY ${asset} SUCCESS: shares - ${shares}, spent - ${spent}, price - ${executionPrice}, fee - ${takerFee.toFixed(2)}, totalCostWithFee - ${totalCostWithFee.toFixed(2)}`);
    asset === AssetType.UP ? state.applyUpFill(shares, spent, this.feeRate) : state.applyDownFill(shares, spent, this.feeRate);
  }

  public async trade(asset: AssetType, mutex: Mutex): Promise<void> {
    if (mutex.isLocked()) return;
  } 
}
