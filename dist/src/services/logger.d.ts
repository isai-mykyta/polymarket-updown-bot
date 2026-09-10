type LogLevel = "info" | "warn" | "error" | "debug";
declare class Logger {
    private readonly logger;
    constructor();
    log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}
export declare const logger: Logger;
export {};
