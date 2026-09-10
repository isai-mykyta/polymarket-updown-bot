export type BinanceApiClientOptions = {
    baseUrl: string;
};
export type BinanceKlinesOptions = {
    limit: string;
    symbol: string;
    endTime: string;
    interval: string;
    startTime: string;
};
export type BinanceWsClientOptions = {
    symbol: string;
    onConnect?: (data?: any) => void;
    onMessage?: (message?: any) => void;
};
export type Kline = [
    number,
    string,
    string,
    string,
    string,
    string,
    number,
    string,
    number,
    string,
    string,
    string
];
