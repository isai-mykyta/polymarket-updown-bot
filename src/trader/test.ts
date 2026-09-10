import { ClobApiClient, MarketClobWsClient } from "../clob";
import { GammaApiClient } from "../gamma";
import { logger } from "../services";
import { getTimeRange, Mutex } from "../utils";
import { Accumulator } from "./accumulator";
import { Executor } from "./executor";
import { state } from "./state";
import { AssetType, RoundDurationMinutes } from "./types";

export type BotConfig = {
  symbol: string;
  testMode: boolean;
  chunksSize: number;
  startShares: number;
  priceBuffer: number;
  sharesLimit: number;
  minAssetCost: number;
  maxTotalSpent?: number;
  roundDurationMinutes: RoundDurationMinutes;
}

export class Trader {
  private readonly oppositeMutex = new Mutex();

  private readonly clobApiClient = new ClobApiClient();
  private readonly gammaApiClient = new GammaApiClient();

  private executor: Executor;
  private accumulator: Accumulator;

  private readonly symbol: string;
  private readonly testMode: boolean;
  private readonly chunksSize: number;
  private readonly priceBuffer: number;
  private readonly startShares: number;
  private readonly sharesLimit: number;
  private readonly minAssetCost: number;
  private readonly maxTotalSpent: number;
  private readonly roundDurationMinutes: RoundDurationMinutes;

  private slug: string = "";
  private feeRate: number = 0;
  private upTokenId: string = "";
  private downTokenId: string = "";
  private conditionId: string = "";
  private roundStartMs: number = 0;

  private readonly marketClobWsClient = new MarketClobWsClient({
    onConnect: () => logger.warn("WebSocket reconnected, subscription restored"),
    onMessage: (msg) => this.handleMarketClobWsEvent(msg),
  });

  constructor (config: BotConfig) {
    this.symbol = config.symbol;
    this.testMode = config.testMode;
    this.chunksSize = config.chunksSize;
    this.sharesLimit = config.sharesLimit;
    this.priceBuffer = config.priceBuffer;
    this.startShares = config.startShares;
    this.minAssetCost = config.minAssetCost;
    this.maxTotalSpent = config.maxTotalSpent;
    this.roundDurationMinutes = config.roundDurationMinutes;
  }

  private async handleMarketClobWsEvent(data: any): Promise<void> {
    if (data.event_type === "book") await this.handleBookEvent(data);
  }

  private getSecondsLeft(): number {
    const roundDurationMs = this.roundDurationMinutes * 60 * 1000;
    const elapsed = Date.now() - this.roundStartMs;
    return Math.max(0, Math.ceil((roundDurationMs - elapsed) / 1000));
  }

  private getPtbdp(): number {
    if (!state.priceToBeat || !state.currentPrice) return 0;
    const priceToBeatDelta = Math.abs(state.priceToBeat - state.currentPrice);
    return (priceToBeatDelta / state.priceToBeat) * 100;
  }

  private async handleBookEvent(data: any): Promise<void> {
    const { asset_id, asks, bids } = data;
    if (!asks?.length || !bids?.length) return;

    const asset: AssetType = asset_id === this.upTokenId ? AssetType.UP : AssetType.DOWN;

    const bestAskSize = Number(asks[asks.length - 1]?.size);
    const bestBidSize = Number(bids[bids.length - 1]?.size);
    const bestAskPrice = Number(asks[asks.length - 1]?.price);
    const bestBidPrice = Number(bids[bids.length - 1]?.price);

    if (!Number.isFinite(bestAskSize) || !Number.isFinite(bestBidSize)) return;
    if (!Number.isFinite(bestAskPrice) || !Number.isFinite(bestBidPrice)) return;

    asset === AssetType.UP ? state.upAskSize = bestAskSize : state.downAskSize = bestAskSize;
    asset === AssetType.UP ? state.upBidSize = bestBidSize : state.downBidSize = bestBidSize;
    asset === AssetType.UP ? state.upAskPrice = bestAskPrice : state.downAskPrice = bestAskPrice;
    asset === AssetType.UP ? state.upBidPrice = bestBidPrice : state.downBidPrice = bestBidPrice;

    if (!state.downAskPrice || !state.upAskPrice) return;
    if (!state.downBidPrice || !state.upBidPrice) return;

    if (asset === AssetType.UP && state.minUpAskPrice === null) state.minUpAskPrice = bestAskPrice;
    if (asset === AssetType.DOWN && state.minDownAskPrice === null) state.minDownAskPrice = bestAskPrice;

    if (asset === AssetType.UP && state.maxUpAskPrice === null) state.maxUpAskPrice = bestAskPrice;
    if (asset === AssetType.DOWN && state.maxDownAskPrice === null) state.maxDownAskPrice = bestAskPrice;

    if (asset === AssetType.UP && bestAskPrice > state.maxUpAskPrice) state.maxUpAskPrice = bestAskPrice;
    if (asset === AssetType.DOWN && bestAskPrice > state.maxDownAskPrice) state.maxDownAskPrice = bestAskPrice;

    if (asset === AssetType.UP && bestAskPrice < state.minUpAskPrice) state.minUpAskPrice = bestAskPrice;
    if (asset === AssetType.DOWN && bestAskPrice < state.minDownAskPrice) state.minDownAskPrice = bestAskPrice;

    state.leader = state.upAskPrice > state.downAskPrice ? AssetType.UP : AssetType.DOWN;

    const qty = state.getQty(asset);
    const ask = state.getAskPrice(asset);
    const avg = state.getAvgPrice(asset);
    const pairCost = state.getPairCost();
    const lastBuy = state.getLastBuyPrice(asset);
    const finishPayout = state.getFinishPayout();

    const ptbdp = this.getPtbdp();

    logger.info(`${asset.padEnd(4, " ")} ask: ${ask.toFixed(2)}, price - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(state.currentPrice)}, ptb - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(state.priceToBeat)}, ptbdp - ${ptbdp.toFixed(3)}, spent: ${state.totalSpent.toFixed(2)}, qty: ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(qty))}, leader: ${state.leader.padEnd(4, " ")}, result: ${finishPayout.toFixed(2)}, avg: ${avg.toFixed(2)}, pairCost: ${pairCost.toFixed(2)}, lastBuy: ${lastBuy.toFixed(2)}, symbol: ${this.symbol}`);
    void this.trade();
  }

  private async trade(): Promise<void> {
    // this.accumulator.accumulateOpposite(this.oppositeMutex);
  }

  public async start(): Promise<void> {
    if (this.marketClobWsClient.isConnected()) {
      logger.warn("═══════════════════════════════════════════════════════════");
      logger.warn("Round finished.");
      logger.warn(`Total spent: ${state.totalSpent.toFixed(3)}, up qty: ${state.upQty.toFixed(3)}, down qty: ${state.downQty.toFixed(3)}, pair cost: ${state.getPairCost().toFixed(3)} result: ${state.getFinishPayout()}`);
      logger.warn("═══════════════════════════════════════════════════════════");

      await this.marketClobWsClient.disconnect();

      const statsData = {
        symbol: this.symbol,
        conditionId: this.conditionId,
        priceToBeat: state.priceToBeat,
        finalPrice: state.currentPrice,
        winner: state.leader,
        won: state.getFinishPayout() > 0,
        actualPayout: Number(state.getFinishPayout().toFixed(4)),
        upQty: Number(state.upQty.toFixed(3)),
        downQty: Number(state.downQty.toFixed(3)),
        upAvgPrice: Number(state.upAvgPrice.toFixed(4)),
        downAvgPrice: Number(state.downAvgPrice.toFixed(4)),
        totalSpent: Number(state.totalSpent.toFixed(4)),
        pairCost: Number(state.getPairCost().toFixed(4)),
        lastUpBuyPrice: Number(state.lastUpBuyPrice.toFixed(4)),
        lastDownBuyPrice: Number(state.lastDownBuyPrice.toFixed(4)),
        lastUpBuyTimestamp: state.lastUpBuyTimestamp ? new Date(state.lastUpBuyTimestamp).toISOString() : null,
        lastDownBuyTimestamp: state.lastDownBuyTimestamp ? new Date(state.lastDownBuyTimestamp).toISOString() : null,
      };
    }

    state.reset();

    logger.info("═══════════════════════════════════════════════════════════");
    logger.info("Starting...");
    logger.info(`Symbol: ${this.symbol}, test mode: ${this.testMode}`);
    logger.info("═══════════════════════════════════════════════════════════");

    await this.clobApiClient.getPolymarketClient();
    const { start } = getTimeRange(`${this.roundDurationMinutes}m`);
    this.roundStartMs = new Date(start).getTime();

    const unixStartDate = Math.floor(this.roundStartMs / 1000);
    const slug = `${this.symbol}-updown-${this.roundDurationMinutes}m-${unixStartDate}`;
    const markets = await this.gammaApiClient.getMarkets({ slug: [slug] });

    if (!markets?.length) throw new Error(`No market: ${slug}`);

    const market = markets[0];
    const [upTokenId, downTokenId] = JSON.parse(market.clobTokenIds);

    this.slug = slug;
    this.upTokenId = upTokenId;
    this.downTokenId = downTokenId;
    this.conditionId = market.conditionId;
    this.feeRate = market.feeSchedule.rate;

    this.executor = new Executor({
      feeRate: this.feeRate,
      testMode: this.testMode,
      upTokenId: this.upTokenId,
      downTokenId: this.downTokenId,
      priceBuffer: this.priceBuffer,
    }, this.clobApiClient);

    this.accumulator = new Accumulator({
      chunksSize: this.chunksSize,
      startShares: this.startShares,
      sharesLimit: this.sharesLimit,
      minAssetCost: this.minAssetCost,
      roundStartMs: this.roundStartMs,
    }, this.executor);

    await this.marketClobWsClient.connect();
    this.marketClobWsClient.subscribe({ assets_ids: [upTokenId, downTokenId] });

    logger.info("═══════════════════════════════════════════════════════════");
    logger.info(`✓ Started: feeRate - ${this.feeRate}`);
    logger.info("═══════════════════════════════════════════════════════════");
  }
}
