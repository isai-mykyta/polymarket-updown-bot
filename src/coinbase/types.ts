export type CoinbaseCandleRaw = [
  number,   // bucket start time, unix seconds
  number, // low
  number, // high
  number, // open
  number, // close
  number // volume
];

export type Granularity = 60 | 300 | 900 | 3600 | 21600 | 86400;

export type CoinbaseWsClientOptions = {
  onConnect?: (data?: any) => void;
  onMessage?: (message?: any) => void;
}
