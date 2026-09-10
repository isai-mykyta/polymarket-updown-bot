export type StatisticsOptions = {
    rootDir: string;
    fileName: string;
};
export declare class StatisticsService {
    private readonly summaryKey;
    private readonly rootDir;
    private readonly fileName;
    constructor(options: StatisticsOptions);
    private buildSummary;
    private buildCombinedSummary;
    private updateCombinedSummary;
    captureRound(namespace: string, title: string, data: any): void;
}
