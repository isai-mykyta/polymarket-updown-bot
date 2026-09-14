/* eslint-disable import/order */
 
import * as dotenv from "dotenv";

dotenv.config();

import { schedule } from "node-cron";
import path from "path";

import { AssetType, Executor, RoundDurationMinutes, state } from "./trader";
import { logger } from "./services";
import { BinanceWsClient , BinanceApiClient } from "./binance/";
import { getTimeRange, Mutex } from "./utils";
import { GammaApiClient } from "./gamma";
import { ClobApiClient, MarketClobWsClient } from "./clob";
import { StatisticsService } from "./services/statistics";
import { Accumulator } from "./trader/accumulator";

const SYMBOL = process.env.SYMBOL;
const TEST_MODE = process.env.TEST_MODE === "true";
const DATA_INTERVAL_MS = Number(process.env.DATA_INTERVAL_MS);
const ROUND_DURATION = Number(process.env.ROUND_DURATION_MINUTES) as RoundDurationMinutes;

const validDurations = [5, 15];
const validSymbols = ["btc", "eth", "sol", "xrp"];

if (!SYMBOL || !validSymbols.includes(SYMBOL)) throw new Error("Symbol is not provided or invalid.");
if (!ROUND_DURATION || !validDurations.includes(ROUND_DURATION)) throw new Error("Round duration is not provided or invalid.");

const mutex = new Mutex();
const clobApiClient = new ClobApiClient();
const gammaApiClient = new GammaApiClient();
const binanceApiClient = new BinanceApiClient({ baseUrl: "https://api.binance.com" });

const mapSymbolToBinancePair = (symbol: string): string => {
  if (symbol.toLocaleLowerCase() === "btc") return "btcusdt";
  if (symbol.toLocaleLowerCase() === "eth") return "ethusdt";
  if (symbol.toLocaleLowerCase() === "sol") return "solusdt";
  if (symbol.toLocaleLowerCase() === "xrp") return "xrpusdt";
};

const binanceWsClient = new BinanceWsClient({
  symbol: mapSymbolToBinancePair(SYMBOL),
  onConnect: () => handleBinanceConnection(),
  onMessage: (msg) => void handlePriceTicker(msg),
});

const marketClobWsClient = new MarketClobWsClient({
  onConnect: () => logger.warn("WebSocket reconnected, subscription restored"),
  onMessage: (msg) => handleMarketClobWsEvent(msg),
});

const statisticsService = new StatisticsService({
  rootDir: path.join(__dirname, "../"),
  fileName: "statistics_summary.json"
});

const handleBinanceConnection = (): void => {
  logger.info(`WebSocket Binance client connected.`);
};

const handleMarketClobWsEvent = async (data: any): Promise<void> => {
  if (data.event_type === "book") await handleBookEvent(data);
};

const handlePriceTicker = async (msg: any): Promise<void> => {
  if (!msg || !msg.e || msg.e !== "aggTrade") return;
  const price = Number(msg.p);
  state.currentPrice = price;
};

const handleBookEvent = async (data: any): Promise<void> => {
  const { asset_id, asks, bids } = data;
  if (!asks?.length || !bids?.length) return;

  const asset: AssetType = asset_id === state.upTokenId ? AssetType.UP : AssetType.DOWN;

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
};

let intervalId: NodeJS.Timeout;

schedule(`*/${ROUND_DURATION} * * * *`, async () => {
  if (intervalId) {
    clearInterval(intervalId);

    statisticsService.captureRound(
      SYMBOL,
      state.slug,
      {
        symbol: SYMBOL,
        priceToBeat: state.priceToBeat,
        finalPrice: state.currentPrice,
        winner: state.leader,
        won: state.getFinishPayout() > 0,
        actualPayout: Number(state.getFinishPayout().toFixed(2)),
        upQty: Number(state.upQty.toFixed(2)),
        downQty: Number(state.downQty.toFixed(2)),
        upAvgPrice: Number(state.upAvgPrice.toFixed(2)),
        downAvgPrice: Number(state.downAvgPrice.toFixed(2)),
        totalSpent: Number(state.totalSpent.toFixed(2)),
        pairCost: Number(state.getPairCost().toFixed(2)),
        lastUpBuyPrice: Number(state.lastUpBuyPrice.toFixed(2)),
        lastDownBuyPrice: Number(state.lastDownBuyPrice.toFixed(2)),
        lastUpBuyTimestamp: state.lastUpBuyTimestamp ? new Date(state.lastUpBuyTimestamp).toISOString() : null,
        lastDownBuyTimestamp: state.lastDownBuyTimestamp ? new Date(state.lastDownBuyTimestamp).toISOString() : null,
      }
    );
  }

  state.reset();

  if (marketClobWsClient.isConnected()) {
    await marketClobWsClient.disconnect();
  }

  logger.info("═══════════════════════════════════════════════════════════");
  logger.info("Starting...");
  logger.info(`Symbol: ${SYMBOL}, duration: ${ROUND_DURATION}m`);
  logger.info("═══════════════════════════════════════════════════════════");

  const now = Date.now();
  const currentSecondStart = Math.floor(now / 1000) * 1000;
  const previousSecondStart = currentSecondStart - 1000;

  await clobApiClient.getPolymarketClient();

  const [kline] = await binanceApiClient.getKlines({
    symbol: mapSymbolToBinancePair(SYMBOL).toLocaleUpperCase(),
    interval: "1s",
    startTime: String(previousSecondStart),
    endTime: String(currentSecondStart - 1),
    limit: "1"
  });

  const [, openPrice] = kline;
  const priceToBeat = Number(openPrice);

  state.testMode = TEST_MODE;
  state.priceToBeat = priceToBeat;

  if (!binanceWsClient.isConnected()) await binanceWsClient.connect();

  const { start } = getTimeRange(`${ROUND_DURATION}m`);
  const roundStartMs = new Date(start).getTime();
  const unixStartDate = Math.floor(roundStartMs / 1000);
  const slug = `${SYMBOL}-updown-${ROUND_DURATION}m-${unixStartDate}`;
  const markets = await gammaApiClient.getMarkets({ slug: [slug] });

  if (!markets?.length) throw new Error(`No market: ${slug}`);

  const market = markets[0];
  const [upTokenId, downTokenId] = JSON.parse(market.clobTokenIds);

  state.slug = slug;
  state.upTokenId = upTokenId;
  state.downTokenId = downTokenId;

  await marketClobWsClient.connect();
  marketClobWsClient.subscribe({ assets_ids: [upTokenId, downTokenId] });

  const executor = new Executor({
    priceBuffer: 1.02,
    downTokenId,
    upTokenId,
    testMode: TEST_MODE,
    feeRate: market.feeSchedule.rate
  }, clobApiClient);

  const accumulator = new Accumulator({
    chunksSize: 20,
    startShares: 5,
    sharesLimit: 150,
    minAssetCost: 1.5
  }, executor);

  state.started = true;

  intervalId = setInterval(() => {
    if (!state.started) return;

    const priceToBeat = state.priceToBeat;
    const currentPrice = state.currentPrice;

    const upAksPrice = state.upAskPrice;
    const downAskPrice = state.downAskPrice;

    const upQty = state.upQty;
    const downQty = state.downQty;

    const upAvg = state.upAvgPrice;
    const downAvg = state.downAvgPrice;

    const lastUpPrice = state.lastUpBuyPrice;
    const lastDownPrice = state.lastDownBuyPrice;

    const spent = state.totalSpent;
    const pairCost = state.getPairCost();
    const finishPayout = state.getFinishPayout();

    if (!upAksPrice) return;
    if (!downAskPrice) return;

    logger.info(`${`UP`.padEnd(4, " ")}: ask - ${upAksPrice.toFixed(2)}, price - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(currentPrice)}, ptb - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(priceToBeat)}, qty - ${upQty.toFixed(2)}, avg - ${upAvg.toFixed(2)}, lastBuy - ${lastUpPrice.toFixed(2)}, spent - ${spent.toFixed(2)}, pairCost - ${pairCost.toFixed(2)}, finishPayout - ${finishPayout.toFixed(2)}`);
    logger.info(`${`DOWN`.padEnd(4, " ")}: ask - ${downAskPrice.toFixed(2)}, price - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(currentPrice)}, ptb - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(priceToBeat)}, qty - ${downQty.toFixed(2)}, avg - ${downAvg.toFixed(2)}, lastBuy - ${lastDownPrice.toFixed(2)}, spent - ${spent.toFixed(2)}, pairCost - ${pairCost.toFixed(2)}, finishPayout - ${finishPayout.toFixed(2)}`);

    const leader = currentPrice >= priceToBeat ? AssetType.UP : AssetType.DOWN;

    if (leader === AssetType.UP && upAksPrice <= 0.45) {
      // logger.warn("═══════════════════════════════════════════════════════════");
      // logger.warn(`UP ASK - ${upAksPrice.toFixed(2)}, current price - ${currentPrice.toFixed(0)}`);
      // logger.warn("═══════════════════════════════════════════════════════════");
      accumulator.accumulateAsset(mutex, AssetType.UP);
    }
    if (leader === AssetType.DOWN && downAskPrice <= 0.45) {
      // logger.warn("═══════════════════════════════════════════════════════════");
      // logger.warn(`DOWN ASK - ${downAskPrice.toFixed(2)}, current price - ${currentPrice.toFixed(0)}`);
      // logger.warn("═══════════════════════════════════════════════════════════");
      accumulator.accumulateAsset(mutex, AssetType.DOWN);
    }
  }, DATA_INTERVAL_MS);
});
