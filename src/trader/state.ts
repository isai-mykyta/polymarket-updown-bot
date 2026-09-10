import { AssetType } from "./types";

class StateMachine {
  public started: boolean = false;
  public testMode: boolean = true;

  public slug: string = "";

  public upTokenId: string = "";
  public downTokenId: string = "";

  public priceToBeat: number = 0;
  public currentPrice: number = 0;

  public upQty: number = 0;
  public downQty: number = 0;

  public upAskPrice: number = 0;
  public downAskPrice: number = 0;

  public minUpAskPrice: number = null;
  public minDownAskPrice: number = null;

  public maxUpAskPrice: number = null;
  public maxDownAskPrice: number = null;

  public upAskSize: number = 0;
  public downAskSize: number = 0;

  public upBidPrice: number = 0;
  public downBidPrice: number = 0;

  public upBidSize: number = 0;
  public downBidSize: number = 0;

  public upAvgPrice: number = 0;
  public downAvgPrice: number = 0;

  public lastUpBuyPrice: number = 0;
  public lastDownBuyPrice: number = 0;

  public lastUpBuyShares: number = 0;
  public lastDownBuyShares: number = 0;

  public lastUpBuyTimestamp: number = 0;
  public lastDownBuyTimestamp: number = 0;

  public totalSpent: number = 0;
  public leader: AssetType = null;

  public reset(): void {
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

  public getFinishPayout(): number {
    const winAsset = this.upAskPrice > this.downAskPrice ? AssetType.UP : AssetType.DOWN;
    const qty = winAsset === AssetType.UP ? this.upQty : this.downQty;
    return qty - this.totalSpent;
  }

  public applyUpFill(shares: number, spent: number, feeRate: number = 0): void {
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

  public applyDownFill(shares: number, spent: number, feeRate: number = 0): void {
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

  public getPairCost(): number {
    return this.upAvgPrice + this.downAvgPrice;
  }
  
  public getQty(asset: AssetType): number {
    return asset === AssetType.UP ? this.upQty : this.downQty;
  }
    
  public getAskPrice(asset: AssetType): number {
    return asset === AssetType.UP ? this.upAskPrice : this.downAskPrice;
  }
    
  public getAskSize(asset: AssetType): number {
    return asset === AssetType.UP ? this.upAskSize : this.downAskSize;
  }
    
  public getBidPrice(asset: AssetType): number {
    return asset === AssetType.UP ? this.upBidPrice : this.downBidPrice;
  }
    
  public getBidSize(asset: AssetType): number {
    return asset === AssetType.UP ? this.upBidSize : this.downBidSize;
  }
    
  public getAvgPrice(asset: AssetType): number {
    return asset === AssetType.UP ? this.upAvgPrice : this.downAvgPrice;
  }
  
  public getLastBuyPrice(asset: AssetType): number {
    return asset === AssetType.UP ? this.lastUpBuyPrice : this.lastDownBuyPrice;
  }

  public getLastBuyShares(asset: AssetType): number {
    return asset === AssetType.UP ? this.lastUpBuyShares : this.lastDownBuyShares;
  }

  public getOppositeAsset(asset: AssetType): AssetType {
    return asset === AssetType.UP ? AssetType.DOWN : AssetType.UP;
  }

  public getMinPrice(asset: AssetType): number {
    return asset === AssetType.UP ? this.minUpAskPrice : this.minDownAskPrice;
  }

  public getMaxPrice(asset: AssetType): number {
    return asset === AssetType.UP ? this.maxUpAskPrice : this.maxDownAskPrice;
  }

  public getLastBuyTimestamp(asset: AssetType): number {
    return asset === AssetType.UP ? this.lastUpBuyTimestamp : this.lastDownBuyTimestamp;
  }
}

export const state = new StateMachine();
