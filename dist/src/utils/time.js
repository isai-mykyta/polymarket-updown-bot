"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeRange = void 0;
const getTimeRange = (interval) => {
    const now = new Date();
    const start = new Date(now);
    const match = interval.match(/^(\d+)([mh])$/);
    const value = Number(match[1]);
    const unit = match[2];
    if (unit === "m") {
        const minutes = start.getMinutes();
        const roundedMinutes = Math.floor(minutes / value) * value;
        start.setMinutes(roundedMinutes, 0, 0);
        const end = new Date(start.getTime() + value * 60 * 1000);
        return { start: start.toISOString(), end: end.toISOString() };
    }
    if (unit === "h") {
        const hours = start.getHours();
        const roundedHours = Math.floor(hours / value) * value;
        start.setHours(roundedHours, 0, 0, 0);
        const end = new Date(start.getTime() + value * 60 * 60 * 1000);
        return { start: start.toISOString(), end: end.toISOString() };
    }
};
exports.getTimeRange = getTimeRange;
