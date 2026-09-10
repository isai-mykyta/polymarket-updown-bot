import winston from "winston";

type LogLevel = "info" | "warn" | "error" | "debug";

const levels: winston.config.AbstractConfigSetLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  private readonly logger: winston.Logger;

  constructor () {
    winston.addColors({
      info: "blue",
      warn: "yellow",
      error: "red",
      debug: "gray",
    });

    this.logger = winston.createLogger({
      levels,
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize({ all: true }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaString = Object.keys(meta).length ? JSON.stringify(meta) : "";
          return `${timestamp} ${level}: ${message} ${metaString}`;
        })
      ),
      transports: [new winston.transports.Console()],
    });
  }

  public log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    this.logger.log(level, message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  public error(message: string, meta?: Record<string, unknown>): void {
    this.log("error", message, meta);
  }
  
  public debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }
}

export const logger = new Logger();
