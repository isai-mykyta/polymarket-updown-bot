"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};
class Logger {
    constructor() {
        winston_1.default.addColors({
            info: "blue",
            warn: "yellow",
            error: "red",
            debug: "gray",
        });
        this.logger = winston_1.default.createLogger({
            levels,
            level: "info",
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((_a) => {
                var { level, message, timestamp } = _a, meta = __rest(_a, ["level", "message", "timestamp"]);
                const metaString = Object.keys(meta).length ? JSON.stringify(meta) : "";
                return `${timestamp} ${level}: ${message} ${metaString}`;
            })),
            transports: [new winston_1.default.transports.Console()],
        });
    }
    log(level, message, meta) {
        this.logger.log(level, message, meta);
    }
    info(message, meta) {
        this.log("info", message, meta);
    }
    warn(message, meta) {
        this.log("warn", message, meta);
    }
    error(message, meta) {
        this.log("error", message, meta);
    }
    debug(message, meta) {
        this.log("debug", message, meta);
    }
}
exports.logger = new Logger();
