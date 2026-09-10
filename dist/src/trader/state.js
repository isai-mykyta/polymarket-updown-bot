"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.state = void 0;
const types_1 = require("./types");
class StateMachine {
    constructor() {
        this.started = false;
        this.testMode = true;
        this.slug = "";
        this.upTokenId = "";
        this.downTokenId = "";
        this.priceToBeat = 0;
        this.currentPrice = 0;
        this.upQty = 0;
        this.downQty = 0;
        this.upAskPrice = 0;
        this.downAskPrice = 0;
        this.minUpAskPrice = null;
        this.minDownAskPrice = null;
        this.maxUpAskPrice = null;
        this.maxDownAskPrice = null;
        this.upAskSize = 0;
        this.downAskSize = 0;
        this.upBidPrice = 0;
        this.downBidPrice = 0;
        this.upBidSize = 0;
        this.downBidSize = 0;
        this.upAvgPrice = 0;
        this.downAvgPrice = 0;
        this.lastUpBuyPrice = 0;
        this.lastDownBuyPrice = 0;
        this.lastUpBuyShares = 0;
        this.lastDownBuyShares = 0;
        this.lastUpBuyTimestamp = 0;
        this.lastDownBuyTimestamp = 0;
        this.totalSpent = 0;
        this.leader = null;
    }
    reset() {
        this.started = false;
        this.testMode = true;
        this.slug = "";
        this.upTokenId = "";
        this.downTokenId = "";
        this.priceToBeat = 0;
        this.currentPrice = 0;
        this.upQty = 0;
        this.downQty = 0;
        this.upAskPrice = 0;
        this.downAskPrice = 0;
        this.upAskSize = 0;
        this.downAskSize = 0;
        this.upBidPrice = 0;
        this.downBidPrice = 0;
        this.upBidSize = 0;
        this.downBidSize = 0;
        this.upAvgPrice = 0;
        this.downAvgPrice = 0;
        this.lastUpBuyPrice = 0;
        this.lastDownBuyPrice = 0;
        this.lastUpBuyShares = 0;
        this.lastDownBuyShares = 0;
        this.lastUpBuyTimestamp = 0;
        this.lastDownBuyTimestamp = 0;
        this.leader = null;
        this.totalSpent = 0;
        this.minUpAskPrice = null;
        this.minDownAskPrice = null;
        this.maxUpAskPrice = null;
        this.maxDownAskPrice = null;
    }
    getFinishPayout() {
        const winAsset = this.upAskPrice > this.downAskPrice ? types_1.AssetType.UP : types_1.AssetType.DOWN;
        const qty = winAsset === types_1.AssetType.UP ? this.upQty : this.downQty;
        return qty - this.totalSpent;
    }
    applyUpFill(shares, spent, feeRate = 0) {
        const price = spent / shares;
        const takerFee = shares * feeRate * price * (1 - price);
        const totalCostWithFee = spent + takerFee;
        const prevTotalSpentUp = this.upAvgPrice * this.upQty;
        this.upQty += shares;
        this.lastUpBuyPrice = price;
        this.lastUpBuyShares = shares;
        this.totalSpent += totalCostWithFee;
        this.lastUpBuyTimestamp = Date.now();
        this.upAvgPrice = (prevTotalSpentUp + totalCostWithFee) / this.upQty;
    }
    applyDownFill(shares, spent, feeRate = 0) {
        const price = spent / shares;
        const takerFee = shares * feeRate * price * (1 - price);
        const totalCostWithFee = spent + takerFee;
        const prevTotalSpentDown = this.downAvgPrice * this.downQty;
        this.downQty += shares;
        this.lastDownBuyPrice = price;
        this.lastDownBuyShares = shares;
        this.totalSpent += totalCostWithFee;
        this.lastDownBuyTimestamp = Date.now();
        this.downAvgPrice = (prevTotalSpentDown + totalCostWithFee) / this.downQty;
    }
    getPairCost() {
        return this.upAvgPrice + this.downAvgPrice;
    }
    getQty(asset) {
        return asset === types_1.AssetType.UP ? this.upQty : this.downQty;
    }
    getAskPrice(asset) {
        return asset === types_1.AssetType.UP ? this.upAskPrice : this.downAskPrice;
    }
    getAskSize(asset) {
        return asset === types_1.AssetType.UP ? this.upAskSize : this.downAskSize;
    }
    getBidPrice(asset) {
        return asset === types_1.AssetType.UP ? this.upBidPrice : this.downBidPrice;
    }
    getBidSize(asset) {
        return asset === types_1.AssetType.UP ? this.upBidSize : this.downBidSize;
    }
    getAvgPrice(asset) {
        return asset === types_1.AssetType.UP ? this.upAvgPrice : this.downAvgPrice;
    }
    getLastBuyPrice(asset) {
        return asset === types_1.AssetType.UP ? this.lastUpBuyPrice : this.lastDownBuyPrice;
    }
    getLastBuyShares(asset) {
        return asset === types_1.AssetType.UP ? this.lastUpBuyShares : this.lastDownBuyShares;
    }
    getOppositeAsset(asset) {
        return asset === types_1.AssetType.UP ? types_1.AssetType.DOWN : types_1.AssetType.UP;
    }
    getMinPrice(asset) {
        return asset === types_1.AssetType.UP ? this.minUpAskPrice : this.minDownAskPrice;
    }
    getMaxPrice(asset) {
        return asset === types_1.AssetType.UP ? this.maxUpAskPrice : this.maxDownAskPrice;
    }
    getLastBuyTimestamp(asset) {
        return asset === types_1.AssetType.UP ? this.lastUpBuyTimestamp : this.lastDownBuyTimestamp;
    }
}
exports.state = new StateMachine();
