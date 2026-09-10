"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwapCalculator = void 0;
class TwapCalculator {
    constructor(windowMs) {
        this.ticks = [];
        this.windowMs = windowMs;
    }
    addTick(price, ts = Date.now()) {
        this.ticks.push({ price, ts });
        this.evictOld(ts);
    }
    evictOld(now) {
        const cutoff = now - this.windowMs;
        let keepFrom = 0;
        while (keepFrom < this.ticks.length - 1 && this.ticks[keepFrom + 1].ts <= cutoff) {
            keepFrom++;
        }
        if (keepFrom > 0)
            this.ticks.splice(0, keepFrom);
    }
    getTwap(now = Date.now()) {
        if (!this.ticks.length)
            return null;
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
        if (!totalWeight)
            return this.ticks[this.ticks.length - 1].price;
        return weightedSum / totalWeight;
    }
}
exports.TwapCalculator = TwapCalculator;
