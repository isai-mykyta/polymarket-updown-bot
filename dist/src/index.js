"use strict";
/* eslint-disable import/order */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const node_cron_1 = require("node-cron");
const path_1 = __importDefault(require("path"));
const trader_1 = require("./trader");
const services_1 = require("./services");
const binance_1 = require("./binance/");
const utils_1 = require("./utils");
const gamma_1 = require("./gamma");
const clob_1 = require("./clob");
const statistics_1 = require("./services/statistics");
const SYMBOL = process.env.SYMBOL;
const TEST_MODE = process.env.TEST_MODE === "true";
const DATA_INTERVAL_MS = Number(process.env.DATA_INTERVAL_MS);
const ROUND_DURATION = Number(process.env.ROUND_DURATION_MINUTES);
const validDurations = [5, 15];
const validSymbols = ["btc", "eth", "sol", "xrp"];
if (!SYMBOL || !validSymbols.includes(SYMBOL))
    throw new Error("Symbol is not provided or invalid.");
if (!ROUND_DURATION || !validDurations.includes(ROUND_DURATION))
    throw new Error("Round duration is not provided or invalid.");
const TWAP_WINDOW_MS = 60000;
const gammaApiClient = new gamma_1.GammaApiClient();
const binanceApiClient = new binance_1.BinanceApiClient({ baseUrl: "https://api.binance.com" });
const twapCalculator = new utils_1.TwapCalculator(TWAP_WINDOW_MS);
const mapSymbolToBinancePair = (symbol) => {
    if (symbol.toLocaleLowerCase() === "btc")
        return "btcusdt";
    if (symbol.toLocaleLowerCase() === "eth")
        return "ethusdt";
    if (symbol.toLocaleLowerCase() === "sol")
        return "solusdt";
    if (symbol.toLocaleLowerCase() === "xrp")
        return "xrpusdt";
};
const binanceWsClient = new binance_1.BinanceWsClient({
    symbol: mapSymbolToBinancePair(SYMBOL),
    onConnect: () => handleBinanceConnection(),
    onMessage: (msg) => void handlePriceTicker(msg),
});
const marketClobWsClient = new clob_1.MarketClobWsClient({
    onConnect: () => services_1.logger.warn("WebSocket reconnected, subscription restored"),
    onMessage: (msg) => handleMarketClobWsEvent(msg),
});
const statisticsService = new statistics_1.StatisticsService({
    rootDir: path_1.default.join(__dirname, "../"),
    fileName: "statistics_summary.json"
});
const handleBinanceConnection = () => {
    services_1.logger.info(`WebSocket Binance client connected.`);
};
const handleMarketClobWsEvent = (data) => __awaiter(void 0, void 0, void 0, function* () {
    if (data.event_type === "book")
        yield handleBookEvent(data);
});
const handlePriceTicker = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!msg || !msg.e || msg.e !== "aggTrade")
        return;
    const price = Number(msg.p);
    const tradeTimeMs = Number(msg.T) || Date.now();
    twapCalculator.addTick(price, tradeTimeMs);
    trader_1.state.currentPrice = (_a = twapCalculator.getTwap(tradeTimeMs)) !== null && _a !== void 0 ? _a : price;
});
const handleBookEvent = (data) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { asset_id, asks, bids } = data;
    if (!(asks === null || asks === void 0 ? void 0 : asks.length) || !(bids === null || bids === void 0 ? void 0 : bids.length))
        return;
    const asset = asset_id === trader_1.state.upTokenId ? trader_1.AssetType.UP : trader_1.AssetType.DOWN;
    const bestAskSize = Number((_a = asks[asks.length - 1]) === null || _a === void 0 ? void 0 : _a.size);
    const bestBidSize = Number((_b = bids[bids.length - 1]) === null || _b === void 0 ? void 0 : _b.size);
    const bestAskPrice = Number((_c = asks[asks.length - 1]) === null || _c === void 0 ? void 0 : _c.price);
    const bestBidPrice = Number((_d = bids[bids.length - 1]) === null || _d === void 0 ? void 0 : _d.price);
    if (!Number.isFinite(bestAskSize) || !Number.isFinite(bestBidSize))
        return;
    if (!Number.isFinite(bestAskPrice) || !Number.isFinite(bestBidPrice))
        return;
    asset === trader_1.AssetType.UP ? trader_1.state.upAskSize = bestAskSize : trader_1.state.downAskSize = bestAskSize;
    asset === trader_1.AssetType.UP ? trader_1.state.upBidSize = bestBidSize : trader_1.state.downBidSize = bestBidSize;
    asset === trader_1.AssetType.UP ? trader_1.state.upAskPrice = bestAskPrice : trader_1.state.downAskPrice = bestAskPrice;
    asset === trader_1.AssetType.UP ? trader_1.state.upBidPrice = bestBidPrice : trader_1.state.downBidPrice = bestBidPrice;
    if (!trader_1.state.downAskPrice || !trader_1.state.upAskPrice)
        return;
    if (!trader_1.state.downBidPrice || !trader_1.state.upBidPrice)
        return;
    if (asset === trader_1.AssetType.UP && trader_1.state.minUpAskPrice === null)
        trader_1.state.minUpAskPrice = bestAskPrice;
    if (asset === trader_1.AssetType.DOWN && trader_1.state.minDownAskPrice === null)
        trader_1.state.minDownAskPrice = bestAskPrice;
    if (asset === trader_1.AssetType.UP && trader_1.state.maxUpAskPrice === null)
        trader_1.state.maxUpAskPrice = bestAskPrice;
    if (asset === trader_1.AssetType.DOWN && trader_1.state.maxDownAskPrice === null)
        trader_1.state.maxDownAskPrice = bestAskPrice;
    if (asset === trader_1.AssetType.UP && bestAskPrice > trader_1.state.maxUpAskPrice)
        trader_1.state.maxUpAskPrice = bestAskPrice;
    if (asset === trader_1.AssetType.DOWN && bestAskPrice > trader_1.state.maxDownAskPrice)
        trader_1.state.maxDownAskPrice = bestAskPrice;
    if (asset === trader_1.AssetType.UP && bestAskPrice < trader_1.state.minUpAskPrice)
        trader_1.state.minUpAskPrice = bestAskPrice;
    if (asset === trader_1.AssetType.DOWN && bestAskPrice < trader_1.state.minDownAskPrice)
        trader_1.state.minDownAskPrice = bestAskPrice;
    trader_1.state.leader = trader_1.state.upAskPrice > trader_1.state.downAskPrice ? trader_1.AssetType.UP : trader_1.AssetType.DOWN;
});
let intervalId;
(0, node_cron_1.schedule)(`*/${ROUND_DURATION} * * * *`, () => __awaiter(void 0, void 0, void 0, function* () {
    if (intervalId) {
        clearInterval(intervalId);
        statisticsService.captureRound(SYMBOL, trader_1.state.slug, {
            symbol: SYMBOL,
            priceToBeat: trader_1.state.priceToBeat,
            finalPrice: trader_1.state.currentPrice,
            winner: trader_1.state.leader,
            won: trader_1.state.getFinishPayout() > 0,
            actualPayout: Number(trader_1.state.getFinishPayout().toFixed(2)),
            upQty: Number(trader_1.state.upQty.toFixed(2)),
            downQty: Number(trader_1.state.downQty.toFixed(2)),
            upAvgPrice: Number(trader_1.state.upAvgPrice.toFixed(2)),
            downAvgPrice: Number(trader_1.state.downAvgPrice.toFixed(2)),
            totalSpent: Number(trader_1.state.totalSpent.toFixed(2)),
            pairCost: Number(trader_1.state.getPairCost().toFixed(2)),
            lastUpBuyPrice: Number(trader_1.state.lastUpBuyPrice.toFixed(2)),
            lastDownBuyPrice: Number(trader_1.state.lastDownBuyPrice.toFixed(2)),
            lastUpBuyTimestamp: trader_1.state.lastUpBuyTimestamp ? new Date(trader_1.state.lastUpBuyTimestamp).toISOString() : null,
            lastDownBuyTimestamp: trader_1.state.lastDownBuyTimestamp ? new Date(trader_1.state.lastDownBuyTimestamp).toISOString() : null,
        });
    }
    trader_1.state.reset();
    if (marketClobWsClient.isConnected()) {
        yield marketClobWsClient.disconnect();
    }
    services_1.logger.info("═══════════════════════════════════════════════════════════");
    services_1.logger.info("Starting...");
    services_1.logger.info(`Symbol: ${SYMBOL}, duration: ${ROUND_DURATION}m`);
    services_1.logger.info("═══════════════════════════════════════════════════════════");
    const now = Date.now();
    const currentSecondStart = Math.floor(now / 1000) * 1000;
    const previousSecondStart = currentSecondStart - 1000;
    const [kline] = yield binanceApiClient.getKlines({
        symbol: mapSymbolToBinancePair(SYMBOL).toLocaleUpperCase(),
        interval: "1s",
        startTime: String(previousSecondStart),
        endTime: String(currentSecondStart - 1),
        limit: "1"
    });
    const [, openPrice] = kline;
    const priceToBeat = Number(openPrice);
    trader_1.state.testMode = TEST_MODE;
    trader_1.state.priceToBeat = priceToBeat;
    if (!binanceWsClient.isConnected())
        yield binanceWsClient.connect();
    const { start } = (0, utils_1.getTimeRange)(`${ROUND_DURATION}m`);
    const roundStartMs = new Date(start).getTime();
    const unixStartDate = Math.floor(roundStartMs / 1000);
    const slug = `${SYMBOL}-updown-${ROUND_DURATION}m-${unixStartDate}`;
    const markets = yield gammaApiClient.getMarkets({ slug: [slug] });
    if (!(markets === null || markets === void 0 ? void 0 : markets.length))
        throw new Error(`No market: ${slug}`);
    const market = markets[0];
    const [upTokenId, downTokenId] = JSON.parse(market.clobTokenIds);
    trader_1.state.slug = slug;
    trader_1.state.upTokenId = upTokenId;
    trader_1.state.downTokenId = downTokenId;
    yield marketClobWsClient.connect();
    marketClobWsClient.subscribe({ assets_ids: [upTokenId, downTokenId] });
    trader_1.state.started = true;
    intervalId = setInterval(() => {
        if (!trader_1.state.started)
            return;
        const priceToBeat = trader_1.state.priceToBeat;
        const currentPrice = trader_1.state.currentPrice;
        const upAksPrice = trader_1.state.upAskPrice;
        const downAskPrice = trader_1.state.downAskPrice;
        if (!upAksPrice)
            return;
        if (!downAskPrice)
            return;
        const priceToBeatDelta = Math.abs(priceToBeat - currentPrice);
        const ptbdp = (priceToBeatDelta / priceToBeat) * 100;
        services_1.logger.info(`${`UP`.padEnd(4, " ")}: ask - ${upAksPrice.toFixed(2)}, price - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(currentPrice)}, ptb - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(priceToBeat)}, ptbdp - ${ptbdp.toFixed(3)}`);
        services_1.logger.info(`${`DOWN`.padEnd(4, " ")}: ask - ${downAskPrice.toFixed(2)}, price - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(currentPrice)}, ptb - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(priceToBeat)}, ptbdp - ${ptbdp.toFixed(3)}`);
        const leader = currentPrice >= priceToBeat ? trader_1.AssetType.UP : trader_1.AssetType.DOWN;
        if (leader === trader_1.AssetType.UP && upAksPrice <= 0.45) {
            services_1.logger.warn("═══════════════════════════════════════════════════════════");
            services_1.logger.warn(`UP ASK - ${upAksPrice.toFixed(2)}, current price - ${currentPrice.toFixed(0)}`);
            services_1.logger.warn("═══════════════════════════════════════════════════════════");
        }
        if (leader === trader_1.AssetType.DOWN && downAskPrice <= 0.45) {
            services_1.logger.warn("═══════════════════════════════════════════════════════════");
            services_1.logger.warn(`DOWN ASK - ${downAskPrice.toFixed(2)}, current price - ${currentPrice.toFixed(0)}`);
            services_1.logger.warn("═══════════════════════════════════════════════════════════");
        }
    }, DATA_INTERVAL_MS);
}));
