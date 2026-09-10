export enum Side {
  BUY = "BUY",
  SELL = "SELL",
}

/**
* FOK (Fill or Kill): The order must be filled entirely or not at all.
* FAK (Fill and Kill): The order can be partially filled, and any unfilled portion is canceled.
*/
export enum OrderType {
  GTC = "GTC",
  FOK = "FOK", // Fill-Or-Kill
  GTD = "GTD",
  FAK = "FAK",
}

export type UserMarketOrder = {
  tokenID: string; // TokenID of the Conditional token asset being traded
  price?: number; // Price used to create the order. If it is not present the market price will be used.
  amount: number; // BUY orders: $$$ Amount to buy. SELL orders: Shares to sell
  side: Side;
  orderType?: OrderType.FOK; 
}
