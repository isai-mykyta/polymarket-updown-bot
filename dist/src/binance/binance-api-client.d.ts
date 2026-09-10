import { ApiClient } from "../services";
import { BinanceApiClientOptions, BinanceKlinesOptions, Kline } from "./types";
export declare class BinanceApiClient extends ApiClient {
    constructor(options: BinanceApiClientOptions);
    getKlines(options: BinanceKlinesOptions): Promise<Kline[]>;
}
