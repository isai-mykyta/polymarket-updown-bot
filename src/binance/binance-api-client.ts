import { ApiClient } from "../services";
import { BinanceApiClientOptions, BinanceKlinesOptions, Kline } from "./types";

export class BinanceApiClient extends ApiClient {
  constructor (options: BinanceApiClientOptions) {
    super(options);
  }

  public async getKlines(options: BinanceKlinesOptions): Promise<Kline[]> {
    return this.get({
      path: `api/v3/klines`,
      params: options
    });
  }
}
