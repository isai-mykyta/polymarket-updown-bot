"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trader = void 0;
const clob_1 = require("../clob");
const gamma_1 = require("../gamma");
const services_1 = require("../services");
const utils_1 = require("../utils");
const accumulator_1 = require("./accumulator");
const executor_1 = require("./executor");
const state_1 = require("./state");
const types_1 = require("./types");
class Trader {
    constructor(config) {
        this.oppositeMutex = new utils_1.Mutex();
        this.clobApiClient = new clob_1.ClobApiClient();
        this.gammaApiClient = new gamma_1.GammaApiClient();
        this.slug = "";
        this.feeRate = 0;
        this.upTokenId = "";
        this.downTokenId = "";
        this.conditionId = "";
        this.roundStartMs = 0;
        this.marketClobWsClient = new clob_1.MarketClobWsClient({
            onConnect: () => services_1.logger.warn("WebSocket reconnected, subscription restored"),
            onMessage: (msg) => this.handleMarketClobWsEvent(msg),
        });
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
    handleMarketClobWsEvent(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data.event_type === "book")
                yield this.handleBookEvent(data);
        });
    }
    getSecondsLeft() {
        const roundDurationMs = this.roundDurationMinutes * 60 * 1000;
        const elapsed = Date.now() - this.roundStartMs;
        return Math.max(0, Math.ceil((roundDurationMs - elapsed) / 1000));
    }
    getPtbdp() {
        if (!state_1.state.priceToBeat || !state_1.state.currentPrice)
            return 0;
        const priceToBeatDelta = Math.abs(state_1.state.priceToBeat - state_1.state.currentPrice);
        return (priceToBeatDelta / state_1.state.priceToBeat) * 100;
    }
    handleBookEvent(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const { asset_id, asks, bids } = data;
            if (!(asks === null || asks === void 0 ? void 0 : asks.length) || !(bids === null || bids === void 0 ? void 0 : bids.length))
                return;
            const asset = asset_id === this.upTokenId ? types_1.AssetType.UP : types_1.AssetType.DOWN;
            const bestAskSize = Number((_a = asks[asks.length - 1]) === null || _a === void 0 ? void 0 : _a.size);
            const bestBidSize = Number((_b = bids[bids.length - 1]) === null || _b === void 0 ? void 0 : _b.size);
            const bestAskPrice = Number((_c = asks[asks.length - 1]) === null || _c === void 0 ? void 0 : _c.price);
            const bestBidPrice = Number((_d = bids[bids.length - 1]) === null || _d === void 0 ? void 0 : _d.price);
            if (!Number.isFinite(bestAskSize) || !Number.isFinite(bestBidSize))
                return;
            if (!Number.isFinite(bestAskPrice) || !Number.isFinite(bestBidPrice))
                return;
            asset === types_1.AssetType.UP ? state_1.state.upAskSize = bestAskSize : state_1.state.downAskSize = bestAskSize;
            asset === types_1.AssetType.UP ? state_1.state.upBidSize = bestBidSize : state_1.state.downBidSize = bestBidSize;
            asset === types_1.AssetType.UP ? state_1.state.upAskPrice = bestAskPrice : state_1.state.downAskPrice = bestAskPrice;
            asset === types_1.AssetType.UP ? state_1.state.upBidPrice = bestBidPrice : state_1.state.downBidPrice = bestBidPrice;
            if (!state_1.state.downAskPrice || !state_1.state.upAskPrice)
                return;
            if (!state_1.state.downBidPrice || !state_1.state.upBidPrice)
                return;
            if (asset === types_1.AssetType.UP && state_1.state.minUpAskPrice === null)
                state_1.state.minUpAskPrice = bestAskPrice;
            if (asset === types_1.AssetType.DOWN && state_1.state.minDownAskPrice === null)
                state_1.state.minDownAskPrice = bestAskPrice;
            if (asset === types_1.AssetType.UP && state_1.state.maxUpAskPrice === null)
                state_1.state.maxUpAskPrice = bestAskPrice;
            if (asset === types_1.AssetType.DOWN && state_1.state.maxDownAskPrice === null)
                state_1.state.maxDownAskPrice = bestAskPrice;
            if (asset === types_1.AssetType.UP && bestAskPrice > state_1.state.maxUpAskPrice)
                state_1.state.maxUpAskPrice = bestAskPrice;
            if (asset === types_1.AssetType.DOWN && bestAskPrice > state_1.state.maxDownAskPrice)
                state_1.state.maxDownAskPrice = bestAskPrice;
            if (asset === types_1.AssetType.UP && bestAskPrice < state_1.state.minUpAskPrice)
                state_1.state.minUpAskPrice = bestAskPrice;
            if (asset === types_1.AssetType.DOWN && bestAskPrice < state_1.state.minDownAskPrice)
                state_1.state.minDownAskPrice = bestAskPrice;
            state_1.state.leader = state_1.state.upAskPrice > state_1.state.downAskPrice ? types_1.AssetType.UP : types_1.AssetType.DOWN;
            const qty = state_1.state.getQty(asset);
            const ask = state_1.state.getAskPrice(asset);
            const avg = state_1.state.getAvgPrice(asset);
            const pairCost = state_1.state.getPairCost();
            const lastBuy = state_1.state.getLastBuyPrice(asset);
            const finishPayout = state_1.state.getFinishPayout();
            const ptbdp = this.getPtbdp();
            services_1.logger.info(`${asset.padEnd(4, " ")} ask: ${ask.toFixed(2)}, price - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(state_1.state.currentPrice)}, ptb - ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(state_1.state.priceToBeat)}, ptbdp - ${ptbdp.toFixed(3)}, spent: ${state_1.state.totalSpent.toFixed(2)}, qty: ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(qty))}, leader: ${state_1.state.leader.padEnd(4, " ")}, result: ${finishPayout.toFixed(2)}, avg: ${avg.toFixed(2)}, pairCost: ${pairCost.toFixed(2)}, lastBuy: ${lastBuy.toFixed(2)}, symbol: ${this.symbol}`);
            void this.trade();
        });
    }
    trade() {
        return __awaiter(this, void 0, void 0, function* () {
            // this.accumulator.accumulateOpposite(this.oppositeMutex);
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.marketClobWsClient.isConnected()) {
                services_1.logger.warn("═══════════════════════════════════════════════════════════");
                services_1.logger.warn("Round finished.");
                services_1.logger.warn(`Total spent: ${state_1.state.totalSpent.toFixed(3)}, up qty: ${state_1.state.upQty.toFixed(3)}, down qty: ${state_1.state.downQty.toFixed(3)}, pair cost: ${state_1.state.getPairCost().toFixed(3)} result: ${state_1.state.getFinishPayout()}`);
                services_1.logger.warn("═══════════════════════════════════════════════════════════");
                yield this.marketClobWsClient.disconnect();
                const statsData = {
                    symbol: this.symbol,
                    conditionId: this.conditionId,
                    priceToBeat: state_1.state.priceToBeat,
                    finalPrice: state_1.state.currentPrice,
                    winner: state_1.state.leader,
                    won: state_1.state.getFinishPayout() > 0,
                    actualPayout: Number(state_1.state.getFinishPayout().toFixed(4)),
                    upQty: Number(state_1.state.upQty.toFixed(3)),
                    downQty: Number(state_1.state.downQty.toFixed(3)),
                    upAvgPrice: Number(state_1.state.upAvgPrice.toFixed(4)),
                    downAvgPrice: Number(state_1.state.downAvgPrice.toFixed(4)),
                    totalSpent: Number(state_1.state.totalSpent.toFixed(4)),
                    pairCost: Number(state_1.state.getPairCost().toFixed(4)),
                    lastUpBuyPrice: Number(state_1.state.lastUpBuyPrice.toFixed(4)),
                    lastDownBuyPrice: Number(state_1.state.lastDownBuyPrice.toFixed(4)),
                    lastUpBuyTimestamp: state_1.state.lastUpBuyTimestamp ? new Date(state_1.state.lastUpBuyTimestamp).toISOString() : null,
                    lastDownBuyTimestamp: state_1.state.lastDownBuyTimestamp ? new Date(state_1.state.lastDownBuyTimestamp).toISOString() : null,
                };
            }
            state_1.state.reset();
            services_1.logger.info("═══════════════════════════════════════════════════════════");
            services_1.logger.info("Starting...");
            services_1.logger.info(`Symbol: ${this.symbol}, test mode: ${this.testMode}`);
            services_1.logger.info("═══════════════════════════════════════════════════════════");
            yield this.clobApiClient.getPolymarketClient();
            const { start } = (0, utils_1.getTimeRange)(`${this.roundDurationMinutes}m`);
            this.roundStartMs = new Date(start).getTime();
            const unixStartDate = Math.floor(this.roundStartMs / 1000);
            const slug = `${this.symbol}-updown-${this.roundDurationMinutes}m-${unixStartDate}`;
            const markets = yield this.gammaApiClient.getMarkets({ slug: [slug] });
            if (!(markets === null || markets === void 0 ? void 0 : markets.length))
                throw new Error(`No market: ${slug}`);
            const market = markets[0];
            const [upTokenId, downTokenId] = JSON.parse(market.clobTokenIds);
            this.slug = slug;
            this.upTokenId = upTokenId;
            this.downTokenId = downTokenId;
            this.conditionId = market.conditionId;
            this.feeRate = market.feeSchedule.rate;
            this.executor = new executor_1.Executor({
                feeRate: this.feeRate,
                testMode: this.testMode,
                upTokenId: this.upTokenId,
                downTokenId: this.downTokenId,
                priceBuffer: this.priceBuffer,
            }, this.clobApiClient);
            this.accumulator = new accumulator_1.Accumulator({
                chunksSize: this.chunksSize,
                startShares: this.startShares,
                sharesLimit: this.sharesLimit,
                minAssetCost: this.minAssetCost,
                roundStartMs: this.roundStartMs,
            }, this.executor);
            yield this.marketClobWsClient.connect();
            this.marketClobWsClient.subscribe({ assets_ids: [upTokenId, downTokenId] });
            services_1.logger.info("═══════════════════════════════════════════════════════════");
            services_1.logger.info(`✓ Started: feeRate - ${this.feeRate}`);
            services_1.logger.info("═══════════════════════════════════════════════════════════");
        });
    }
}
exports.Trader = Trader;
