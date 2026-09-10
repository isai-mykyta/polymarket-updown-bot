import { Chain, ClobClient } from "@polymarket/clob-client-v2";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";

import { HOSTS, RPC_URL, SIGNATURE_TYPE } from "../constants";
import { logger } from "../services";
import { UserMarketOrder } from "./types";

export class ClobApiClient {
  private clobClient: ClobClient | null = null;

  public async initClobClient(): Promise<void> {
    logger.info("Initializing Polymarket CLOB client...");
    const account = privateKeyToAccount(process.env.EOA_PRIVATE_KEY as `0x${string}`);

    const signer = createWalletClient({
      account,
      chain: polygon,
      transport: http(RPC_URL),
    }) as any;

    const options = {
      host: HOSTS.CLOB_API_URL,
      chain: Chain.POLYGON,
      signer,
      signatureType: SIGNATURE_TYPE.CUSTOM_PROXY,
      funderAddress: process.env.POLYMARKET_FUNDER,
    };

    const tempClient = new ClobClient(options);
    const creds = await tempClient.createOrDeriveApiKey();
    
    this.clobClient = new ClobClient({ ...options, creds });
    logger.info("Polymarket CLOB client initialized");
  }

  public async getPolymarketClient(): Promise<ClobClient> {
    if (this.clobClient) return this.clobClient;
    await this.initClobClient();
    return this.clobClient;
  }

  public async createMarketOrder(order: UserMarketOrder): Promise<any> {
    const client = await this.getPolymarketClient();
    const result = await client.createAndPostMarketOrder(order);

    if (result?.status !== "matched") throw new Error(`Failed to create market order: ${JSON.stringify(result)}`);
    return result;
  }
}
