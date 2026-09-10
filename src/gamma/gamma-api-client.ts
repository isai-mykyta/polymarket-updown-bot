import { HOSTS } from "../constants";
import { ApiClient } from "../services";
import { GetMarketsOptions, Market } from "./types";

const { GAMMA_API_URL } = HOSTS;

export class GammaApiClient extends ApiClient {
  constructor () {
    super({ baseUrl: GAMMA_API_URL });
  }

  public async getMarkets(options: GetMarketsOptions = {}): Promise<Market[]> {
    return this.get({
      path: "/markets",
      params: options,
      headers: {
        "Accept-Encoding": "gzip",
        "User-Agent": `@polymarket/clob-client`
      }
    });
  }
}
