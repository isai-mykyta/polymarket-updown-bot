export type BinanceApiClientOptions = {
  baseUrl: string;
}

export type BinanceKlinesOptions = {
  limit: string;
  symbol: string;
  endTime: string;
  interval: string;
  startTime: string;
}

export type BinanceWsClientOptions = {
  symbol: string;
  onConnect?: (data?: any) => void;
  onMessage?: (message?: any) => void;
}

export type Kline = [
  number, // Open time
  string, // Open price
  string, // High price
  string, // Low price
  string, // Close price
  string, // Volume
  number, // Close time
  string, // Quote asset volume
  number, // Number of trades
  string, // Taker buy base asset volume
  string, // Taker buy quote asset volume
  string, // Unused
]
