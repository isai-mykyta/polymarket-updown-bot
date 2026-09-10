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
exports.Accumulator = void 0;
const services_1 = require("../services");
const state_1 = require("./state");
class Accumulator {
    constructor(options, executor) {
        this.executor = executor;
        this.chunksSize = options.chunksSize;
        this.startShares = options.startShares;
        this.sharesLimit = options.sharesLimit;
        this.minAssetCost = options.minAssetCost;
        this.roundStartMs = options.roundStartMs;
    }
    isSpreadReached(askPrice, spread) {
        if (!spread)
            return false;
        const remainder = askPrice % spread;
        return remainder < 0.005 || spread - remainder < 0.005;
    }
    accumulateOpposite(mutex) {
        return __awaiter(this, void 0, void 0, function* () {
            if (mutex.isLocked())
                return;
            const { leader } = state_1.state;
            const oppositeAsset = state_1.state.getOppositeAsset(leader);
            const oppositeQty = state_1.state.getQty(oppositeAsset);
            const oppositeAskPrice = state_1.state.getAskPrice(oppositeAsset);
            const oppositeLastBuyPrice = state_1.state.getLastBuyPrice(oppositeAsset);
            if (oppositeAskPrice >= 0.30)
                return;
            const lastBuyDelta = Math.abs(oppositeAskPrice - oppositeLastBuyPrice);
            if (!!oppositeLastBuyPrice && lastBuyDelta <= 0.03)
                return;
            let shares = 0;
            if (oppositeAskPrice <= 0.30)
                shares = this.startShares + (oppositeQty * 0.05);
            if (oppositeAskPrice >= 0.25)
                shares = this.startShares + (oppositeQty * 0.15);
            if (oppositeAskPrice >= 0.20)
                shares = this.startShares + (oppositeQty * 0.25);
            const executionPrice = this.executor.getExecutionPrice(oppositeAskPrice);
            const limitAdjustedShares = Math.min(shares, this.sharesLimit);
            const assetCost = limitAdjustedShares * executionPrice;
            if (assetCost < this.minAssetCost)
                return;
            if (limitAdjustedShares <= 0)
                return;
            services_1.logger.info(`═════════════ ACCUMULATE OPPOSITE: ${oppositeAsset}, shares - ${limitAdjustedShares.toFixed(2)}, ask - ${oppositeAskPrice.toFixed(2)}, lastBuy - ${oppositeLastBuyPrice.toFixed(2)} ═════════════`);
            yield this.executor.buyAssetInChunks(oppositeAsset, limitAdjustedShares, this.chunksSize, mutex);
        });
    }
}
exports.Accumulator = Accumulator;
