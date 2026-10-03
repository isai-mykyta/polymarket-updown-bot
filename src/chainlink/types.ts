export type ChainlinkSymbol = "btc/usd" | "eth/usd" | "sol/usd" | "xrp/usd";

export type ChainlinkPricePoint = {
  timestamp: number; // unix ms
  value: number;
};

// live tick: { topic: "crypto_prices_chainlink", type: "update", payload: { symbol, timestamp, value, full_accuracy_value } }
export type ChainlinkUpdateMessage = {
  topic: "crypto_prices_chainlink";
  type: "update";
  timestamp: number; // server send time, unix ms
  connection_id?: string;
  payload: ChainlinkPricePoint & {
    symbol: ChainlinkSymbol;
    full_accuracy_value: string;
  };
};

// sent once right after subscribe: ~60s of per-second history
// NOTE: RTDS labels it topic "crypto_prices" / type "subscribe" even for the chainlink topic
export type ChainlinkSnapshotMessage = {
  topic: string;
  type: "subscribe";
  timestamp: number;
  payload: {
    symbol: ChainlinkSymbol;
    data: ChainlinkPricePoint[];
  };
};

export type ChainlinkMessage = ChainlinkUpdateMessage | ChainlinkSnapshotMessage;

export type ChainlinkWsClientOptions = {
  onConnect?: (data?: any) => void;
  onMessage?: (message?: any) => void;
}
