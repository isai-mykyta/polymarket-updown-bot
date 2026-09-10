export declare enum Side {
    BUY = "BUY",
    SELL = "SELL"
}
/**
* FOK (Fill or Kill): The order must be filled entirely or not at all.
* FAK (Fill and Kill): The order can be partially filled, and any unfilled portion is canceled.
*/
export declare enum OrderType {
    GTC = "GTC",
    FOK = "FOK",// Fill-Or-Kill
    GTD = "GTD",
    FAK = "FAK"
}
export type UserMarketOrder = {
    tokenID: string;
    price?: number;
    amount: number;
    side: Side;
    orderType?: OrderType.FOK;
};
