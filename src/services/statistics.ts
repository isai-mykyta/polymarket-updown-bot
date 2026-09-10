import fs from "fs";
import path from "path";

import { logger } from "./logger";

export type StatisticsOptions = {
  rootDir: string;
  fileName: string;
}

export class StatisticsService {
  private readonly summaryKey = "_summary";
  private readonly rootDir: string;
  private readonly fileName: string;

  constructor (options: StatisticsOptions) {
    this.rootDir = options.rootDir;
    this.fileName = options.fileName;
  }

  private buildSummary(statistics: Record<string, any>): Record<string, any> | null {
    const rounds = Object.entries(statistics).filter(([key]) => key !== this.summaryKey).map(([, round]) => round);
    const totalRounds = rounds.length;

    if (!totalRounds) return null;

    const wins = rounds.filter((round) => round?.won === true).length;
    const losses = rounds.filter((round) => round?.won !== true && round?.totalSpent > 0).length;
    const totalPayout = rounds.reduce((sum, round) => sum + (Number(round?.actualPayout) || 0), 0);
    const maxSpentPerRound = rounds.reduce((sum, round) => round?.totalSpent > sum ? round?.totalSpent : sum, 0);
    const maxWin = rounds.reduce((sum, round) => round?.won && round?.actualPayout > sum ? round?.actualPayout : sum,  0);
    const maxLoss = rounds.filter((round) => round?.won !== true).reduce((sum, round) => round?.won && Math.abs(round?.actualPayout) > Math.abs(sum) ? round?.actualPayout : sum,  0);

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
  };

  private buildCombinedSummary(): Record<string, any> | null {
    const files = fs.readdirSync(this.rootDir).filter((file) => /^statistics_.+\.json$/.test(file) && file !== this.fileName);
    const bySymbol: Record<string, any> = {};

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
        const parsed = JSON.parse(fs.readFileSync(path.join(this.rootDir, file), "utf8"));
        const summary = parsed?.[this.summaryKey];

        if (!summary) continue;

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
      } catch {
        logger.warn(`Failed to parse ${file} while building combined summary`);
      }
    }

    if (!totalRounds) return null;

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
  };

  private updateCombinedSummary(): void {
    const combined = this.buildCombinedSummary();
    if (!combined) return;
    fs.writeFileSync(path.join(this.rootDir, this.fileName), JSON.stringify(combined, null, 2));
  };

  public captureRound(namespace: string, title: string, data: any): void {
    const statsPath = path.join(this.rootDir, `statistics_${namespace}.json`);
    let statistics: Record<string, any> = {};

    if (fs.existsSync(statsPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(statsPath, "utf8"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) statistics = parsed;
      } catch {
        logger.warn(`Failed to parse statistics_${namespace}.json, starting fresh`);
      }
    }

    statistics[title] = data;

    const summary = this.buildSummary(statistics);
    if (summary) statistics[this.summaryKey] = summary;

    fs.writeFileSync(statsPath, JSON.stringify(statistics, null, 2));

    this.updateCombinedSummary();
  };
}
