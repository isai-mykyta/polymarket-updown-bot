"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger");
class StatisticsService {
    constructor(options) {
        this.summaryKey = "_summary";
        this.rootDir = options.rootDir;
        this.fileName = options.fileName;
    }
    buildSummary(statistics) {
        const rounds = Object.entries(statistics).filter(([key]) => key !== this.summaryKey).map(([, round]) => round);
        const totalRounds = rounds.length;
        if (!totalRounds)
            return null;
        const wins = rounds.filter((round) => (round === null || round === void 0 ? void 0 : round.won) === true).length;
        const losses = rounds.filter((round) => (round === null || round === void 0 ? void 0 : round.won) !== true && (round === null || round === void 0 ? void 0 : round.totalSpent) > 0).length;
        const totalPayout = rounds.reduce((sum, round) => sum + (Number(round === null || round === void 0 ? void 0 : round.actualPayout) || 0), 0);
        const maxSpentPerRound = rounds.reduce((sum, round) => (round === null || round === void 0 ? void 0 : round.totalSpent) > sum ? round === null || round === void 0 ? void 0 : round.totalSpent : sum, 0);
        const maxWin = rounds.reduce((sum, round) => (round === null || round === void 0 ? void 0 : round.won) && (round === null || round === void 0 ? void 0 : round.actualPayout) > sum ? round === null || round === void 0 ? void 0 : round.actualPayout : sum, 0);
        const maxLoss = rounds.filter((round) => (round === null || round === void 0 ? void 0 : round.won) !== true).reduce((sum, round) => (round === null || round === void 0 ? void 0 : round.won) && Math.abs(round === null || round === void 0 ? void 0 : round.actualPayout) > Math.abs(sum) ? round === null || round === void 0 ? void 0 : round.actualPayout : sum, 0);
        return {
            totalRounds,
            wins,
            losses,
            winRate: Number((wins / totalRounds).toFixed(2)),
            totalPayout: Number(totalPayout.toFixed(2)),
            avgPayout: Number((totalPayout / totalRounds).toFixed(2)),
            updatedAt: new Date().toISOString(),
            maxWin: Number(maxWin.toFixed(2)),
            maxLoss: Number(maxLoss.toFixed(2)),
            maxSpentPerRound
        };
    }
    ;
    buildCombinedSummary() {
        const files = fs_1.default.readdirSync(this.rootDir).filter((file) => /^statistics_.+\.json$/.test(file) && file !== this.fileName);
        const bySymbol = {};
        let totalRounds = 0;
        let wins = 0;
        let losses = 0;
        let totalPayout = 0;
        let maxWin = 0;
        let maxLoss = 0;
        let maxSpentPerRound = 0;
        let winPayoutSum = 0;
        let lossPayoutSum = 0;
        for (const file of files) {
            const namespace = file.replace(/^statistics_/, "").replace(/\.json$/, "");
            try {
                const parsed = JSON.parse(fs_1.default.readFileSync(path_1.default.join(this.rootDir, file), "utf8"));
                const summary = parsed === null || parsed === void 0 ? void 0 : parsed[this.summaryKey];
                if (!summary)
                    continue;
                bySymbol[namespace] = summary;
                totalRounds += summary.totalRounds || 0;
                wins += summary.wins || 0;
                losses += summary.losses || 0;
                totalPayout += summary.totalPayout || 0;
                maxWin = Math.max(maxWin, summary.maxWin || 0);
                maxLoss = Math.min(maxLoss, summary.maxLoss || 0);
                maxSpentPerRound = Math.max(maxSpentPerRound, summary.maxSpentPerRound || 0);
                winPayoutSum += (summary.avgWin || 0) * (summary.wins || 0);
                lossPayoutSum += Math.abs(Number(summary.avgLoss) || 0) * (summary.losses || 0);
            }
            catch (_a) {
                logger_1.logger.warn(`Failed to parse ${file} while building combined summary`);
            }
        }
        if (!totalRounds)
            return null;
        return {
            totalRounds,
            wins,
            losses,
            winRate: Number((wins / totalRounds).toFixed(2)),
            totalPayout: Number(totalPayout.toFixed(2)),
            avgPayout: Number((totalPayout / totalRounds).toFixed(2)),
            updatedAt: new Date().toISOString(),
            maxWin: Number(maxWin.toFixed(2)),
            maxLoss: Number(maxLoss.toFixed(2)),
            maxSpentPerRound,
            bySymbol,
        };
    }
    ;
    updateCombinedSummary() {
        const combined = this.buildCombinedSummary();
        if (!combined)
            return;
        fs_1.default.writeFileSync(path_1.default.join(this.rootDir, this.fileName), JSON.stringify(combined, null, 2));
    }
    ;
    captureRound(namespace, title, data) {
        const statsPath = path_1.default.join(this.rootDir, `statistics_${namespace}.json`);
        let statistics = {};
        if (fs_1.default.existsSync(statsPath)) {
            try {
                const parsed = JSON.parse(fs_1.default.readFileSync(statsPath, "utf8"));
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
                    statistics = parsed;
            }
            catch (_a) {
                logger_1.logger.warn(`Failed to parse statistics_${namespace}.json, starting fresh`);
            }
        }
        statistics[title] = data;
        const summary = this.buildSummary(statistics);
        if (summary)
            statistics[this.summaryKey] = summary;
        fs_1.default.writeFileSync(statsPath, JSON.stringify(statistics, null, 2));
        this.updateCombinedSummary();
    }
    ;
}
exports.StatisticsService = StatisticsService;
