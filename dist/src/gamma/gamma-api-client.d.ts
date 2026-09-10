import { ApiClient } from "../services";
import { GetMarketsOptions, Market } from "./types";
export declare class GammaApiClient extends ApiClient {
    constructor();
    getMarkets(options?: GetMarketsOptions): Promise<Market[]>;
}
