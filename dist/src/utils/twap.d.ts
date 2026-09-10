export declare class TwapCalculator {
    private readonly windowMs;
    private ticks;
    constructor(windowMs: number);
    addTick(price: number, ts?: number): void;
    private evictOld;
    getTwap(now?: number): number | null;
}
