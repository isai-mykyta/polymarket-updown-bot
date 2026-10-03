/* eslint-disable import/order */
 
import * as dotenv from "dotenv";

dotenv.config();

import { schedule } from "node-cron";
import path from "path";

import { AssetType, Executor, RoundDurationMinutes, state } from "./trader";
import { logger } from "./services";
import { ChainlinkMessage, ChainlinkPricePoint, ChainlinkSymbol, ChainlinkWsClient } from "./chainlink";
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

const CHAINLINK_SYMBOL = `${SYMBOL.toLowerCase()}/usd` as ChainlinkSymbol;

// how long to keep per-second chainlink prices around for priceToBeat lookups
const PRICE_HISTORY_MS = 5 * 60_000;
// how long to wait for the chainlink tick stamped at round start (ticks arrive ~1-2s late)
const PRICE_TO_BEAT_TIMEOUT_MS = 10_000;

// chainlink price by its timestamp (unix ms)
const priceHistory = new Map<number, number>();

const chainlinkWsClient = new ChainlinkWsClient({
  onConnect: () => handleChainlinkConnection(),
  onMessage: (msg) => handlePriceTicker(msg),
});

const marketClobWsClient = new MarketClobWsClient({
  onConnect: () => logger.warn("WebSocket reconnected, subscription restored"),
  onMessage: (msg) => handleMarketClobWsEvent(msg),
});

const statisticsService = new StatisticsService({
  rootDir: path.join(__dirname, "../"),
  fileName: "statistics_summary.json"
});

const handleChainlinkConnection = (): void => {
  logger.info(`WebSocket Chainlink client connected.`);
  // subscribe on every (re)connect - the server sends a ~60s history snapshot, which backfills gaps
  chainlinkWsClient.subscribe([CHAINLINK_SYMBOL]);
};

const handleMarketClobWsEvent = async (data: any): Promise<void> => {
  if (data.event_type === "book") await handleBookEvent(data);
};

const storePricePoint = ({ timestamp, value }: ChainlinkPricePoint): void => {
  if (!Number.isFinite(timestamp) || !Number.isFinite(value)) return;
  priceHistory.set(timestamp, value);
};

const prunePriceHistory = (): void => {
  const minTimestamp = Date.now() - PRICE_HISTORY_MS;
  for (const timestamp of priceHistory.keys()) {
    if (timestamp < minTimestamp) priceHistory.delete(timestamp);
  }
};

const handlePriceTicker = (msg: ChainlinkMessage): void => {
  if (ChainlinkWsClient.isSnapshot(msg)) {
    if (msg.payload.symbol !== CHAINLINK_SYMBOL) return;
    msg.payload.data.forEach(storePricePoint);
    prunePriceHistory();
    return;
  }

  if (!ChainlinkWsClient.isUpdate(msg) || msg.payload.symbol !== CHAINLINK_SYMBOL) return;

  const { timestamp, value } = msg.payload;
  if (!Number.isFinite(value)) return;

  storePricePoint({ timestamp, value });
  prunePriceHistory();

  state.currentPrice = value;
};

// priceToBeat = chainlink price stamped exactly at round start (what polymarket resolves against)
const waitForPriceAt = async (timestampMs: number, timeoutMs: number): Promise<number | undefined> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const price = priceHistory.get(timestampMs);
    if (price !== undefined) return price;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return priceHistory.get(timestampMs);
};

const ensureChainlinkConnected = async (): Promise<void> => {
  if (chainlinkWsClient.isConnected()) return;

  try {
    await chainlinkWsClient.connect();
  } catch (err) {
    logger.warn(`Chainlink WS connect failed: ${err}`);
  }
};

const getPtbdp = (): number => {
  if (!state.priceToBeat || !state.currentPrice) return 0;
  const priceToBeatDelta = Math.abs(state.priceToBeat - state.currentPrice);
  return (priceToBeatDelta / state.priceToBeat) * 100;
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

const captureRound = (): void => {
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
};

let intervalId: NodeJS.Timeout;

// connect before the first round so the round-start tick is already streaming in
void ensureChainlinkConnected();

schedule(`*/${ROUND_DURATION} * * * *`, async () => {
  if (intervalId) {
    clearInterval(intervalId);
    captureRound();
  }

  state.reset();

  if (marketClobWsClient.isConnected()) {
    await marketClobWsClient.disconnect();
  }

  logger.info("═══════════════════════════════════════════════════════════");
  logger.info("Starting...");
  logger.info(`Symbol: ${SYMBOL}, duration: ${ROUND_DURATION}m`);
  logger.info("═══════════════════════════════════════════════════════════");

  const { start } = getTimeRange(`${ROUND_DURATION}m`);

  await clobApiClient.getPolymarketClient();

  const roundStartMs = new Date(start).getTime();

  await ensureChainlinkConnected();

  const priceToBeat = await waitForPriceAt(roundStartMs, PRICE_TO_BEAT_TIMEOUT_MS);

  if (priceToBeat === undefined) {
    logger.warn(`No Chainlink price found for priceToBeat. symbol: ${CHAINLINK_SYMBOL}, timestamp: ${start}`);
    return;
  }

  state.testMode = TEST_MODE;
  state.priceToBeat = priceToBeat;

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
    startShares: 10,
    sharesLimit: 150,
    minAssetCost: 1.5
  }, executor);

  state.started = true;

  intervalId = setInterval(() => {
    if (!state.started) return;

    const {
      priceToBeat,
      currentPrice,
      upAskPrice,
      downAskPrice,
      upQty,
      downQty,
      upAvgPrice,
      downAvgPrice,
      lastUpBuyPrice,
      lastDownBuyPrice
    } = state;

    const ptbdp = getPtbdp();
    const spent = state.totalSpent;
    const pairCost = state.getPairCost();
    const finishPayout = state.getFinishPayout();

    if (!upAskPrice) return;
    if (!downAskPrice) return;

    logger.info(`${`UP`.padEnd(4, " ")}: ask - ${upAskPrice.toFixed(2)}, price - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(currentPrice)}, ptb - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(priceToBeat)}, ptbdp - ${ptbdp.toFixed(2)}, qty - ${upQty.toFixed(2)}, avg - ${upAvgPrice.toFixed(2)}, lastBuy - ${lastUpBuyPrice.toFixed(2)}, spent - ${spent.toFixed(2)}, pairCost - ${pairCost.toFixed(2)}, finishPayout - ${finishPayout.toFixed(2)}`);
    logger.info(`${`DOWN`.padEnd(4, " ")}: ask - ${downAskPrice.toFixed(2)}, price - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(currentPrice)}, ptb - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(priceToBeat)}, ptbdp - ${ptbdp.toFixed(2)}, qty - ${downQty.toFixed(2)}, avg - ${downAvgPrice.toFixed(2)}, lastBuy - ${lastDownBuyPrice.toFixed(2)}, spent - ${spent.toFixed(2)}, pairCost - ${pairCost.toFixed(2)}, finishPayout - ${finishPayout.toFixed(2)}`);
  }, DATA_INTERVAL_MS);
});
