import { HOSTS } from "../constants";
import { ApiClient } from "../services";
import { CoinbaseCandleRaw, Granularity } from "./types";

export class CoinbaseApiClient extends ApiClient {
  constructor () {
    super({ baseUrl: HOSTS.COINBASE_API_CLIENT });
  }

  public async getProductCandles(
    product: string, 
    start: string, 
    end: string, 
    granularity: Granularity = 60
  ): Promise<CoinbaseCandleRaw[]> {
    return this.get<CoinbaseCandleRaw[]>({
      path: `/products/${product}/candles`,
      params: { start, end, granularity },
    });
  }
}
