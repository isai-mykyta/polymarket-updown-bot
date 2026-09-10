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
const services_1 = require("../services");
const utils_1 = require("../utils");
const state_1 = require("./state");
const types_1 = require("./types");
class Trader {
    constructor(options, clobApiClient) {
        this.clobApiClient = clobApiClient;
        this.feeRate = options.feeRate;
        this.priceBuffer = options.priceBuffer;
    }
    isValidCombinedAskPrice() {
        return state_1.state.upAskPrice + state_1.state.downAskPrice <= 1.05; // .05 as a buffer
    }
    getExecutionPrice(price) {
        return !Number.isFinite(price) ? price : Math.min(price * this.priceBuffer, 0.99);
    }
    buyAssetInChunks(asset_1, totalShares_1, chunkSize_1, mutex_1) {
        return __awaiter(this, arguments, void 0, function* (asset, totalShares, chunkSize, mutex, retryUntilSuccess = false) {
            yield mutex.runExclusive(() => __awaiter(this, void 0, void 0, function* () {
                services_1.logger.info(`📤 Attempt to buy ${totalShares} ${asset} shares in ${chunkSize} chunk size`);
                if (!this.isValidCombinedAskPrice()) {
                    services_1.logger.warn(`❌ Invalid combined ASK price, skipping trade.`);
                    return;
                }
                yield (0, utils_1.executeInChunks)(totalShares, chunkSize, (size) => __awaiter(this, void 0, void 0, function* () {
                    const askPrice = state_1.state.getAskPrice(asset);
                    yield this.buyAsset(asset, askPrice, size);
                }), retryUntilSuccess);
                services_1.logger.info(`✅ All ${totalShares} ${asset} shares bought successfully`);
            }));
        });
    }
    buyAsset(asset, price, targetShares) {
        return __awaiter(this, void 0, void 0, function* () {
            const executionPrice = Math.min(price * this.priceBuffer, 0.99);
            const cost = targetShares * executionPrice;
            const tokenID = asset === types_1.AssetType.UP ? state_1.state.upTokenId : state_1.state.downTokenId;
            if (targetShares < 1 || cost < 1)
                return;
            const order = {
                tokenID,
                price: executionPrice,
                amount: cost,
                orderType: clob_1.OrderType.FOK,
                side: clob_1.Side.BUY
            };
            services_1.logger.info(`📤 BUY ATTEMPT ${asset}: shares - ${targetShares}, price ${executionPrice.toFixed(2)} = $${cost.toFixed(2)}`);
            let result;
            if (state_1.state.testMode) {
                yield new Promise((resolve) => setTimeout(() => resolve(), 1200)); // simulate network delay
                result = { takingAmount: targetShares, makingAmount: cost };
            }
            else {
                result = yield this.clobApiClient.createMarketOrder(order);
            }
            const shares = Number(result.takingAmount);
            const spent = Number(result.makingAmount);
            const takerFee = shares * this.feeRate * price * (1 - price);
            const totalCostWithFee = spent + takerFee;
            services_1.logger.info(`✅ BUY ${asset} SUCCESS: shares - ${shares}, spent - ${spent}, price - ${executionPrice}, fee - ${takerFee.toFixed(2)}, totalCostWithFee - ${totalCostWithFee.toFixed(2)}`);
            asset === types_1.AssetType.UP ? state_1.state.applyUpFill(shares, spent, this.feeRate) : state_1.state.applyDownFill(shares, spent, this.feeRate);
        });
    }
    trade(asset, mutex) {
        return __awaiter(this, void 0, void 0, function* () {
            if (mutex.isLocked())
                return;
        });
    }
}
exports.Trader = Trader;
