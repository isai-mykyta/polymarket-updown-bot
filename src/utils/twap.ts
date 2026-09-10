type Tick = { price: number; ts: number };

export class TwapCalculator {
  private readonly windowMs: number;
  private ticks: Tick[] = [];

  constructor (windowMs: number) {
    this.windowMs = windowMs;
  }

  public addTick(price: number, ts: number = Date.now()): void {
    this.ticks.push({ price, ts });
    this.evictOld(ts);
  }

  private evictOld(now: number): void {
    const cutoff = now - this.windowMs;
    let keepFrom = 0;

    while (keepFrom < this.ticks.length - 1 && this.ticks[keepFrom + 1].ts <= cutoff) {
      keepFrom++;
    }

    if (keepFrom > 0) this.ticks.splice(0, keepFrom);
  }

  public getTwap(now: number = Date.now()): number | null {
    if (!this.ticks.length) return null;

    const windowStart = now - this.windowMs;

    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < this.ticks.length; i++) {
      const point = this.ticks[i];
      const segmentStart = Math.max(point.ts, windowStart);
      const segmentEnd = i + 1 < this.ticks.length ? this.ticks[i + 1].ts : now;
      const duration = Math.max(0, segmentEnd - segmentStart);

      weightedSum += point.price * duration;
      totalWeight += duration;
    }

    if (!totalWeight) return this.ticks[this.ticks.length - 1].price;

    return weightedSum / totalWeight;
  }
}
