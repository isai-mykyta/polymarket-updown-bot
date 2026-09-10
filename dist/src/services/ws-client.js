"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsClient = void 0;
const ws_1 = require("ws");
const logger_1 = require("./logger");
var ConnectionState;
(function (ConnectionState) {
    ConnectionState["DISCONNECTED"] = "DISCONNECTED";
    ConnectionState["CONNECTING"] = "CONNECTING";
    ConnectionState["CONNECTED"] = "CONNECTED";
    ConnectionState["RECONNECTING"] = "RECONNECTING";
})(ConnectionState || (ConnectionState = {}));
class WsClient {
    constructor(options) {
        this.autoReconnect = true;
        this.connectionState = ConnectionState.DISCONNECTED;
        this.pingTimeout = null;
        this.onError = (err) => {
            logger_1.logger.error("WebSocket error", { err: err.message });
        };
        this.onOpen = () => {
            var _a;
            this.connectionState = ConnectionState.CONNECTED;
            this.schedulePing();
            logger_1.logger.info("WebSocket connected");
            (_a = this.onConnect) === null || _a === void 0 ? void 0 : _a.call(this);
        };
        this.onMessage = (data) => {
            var _a;
            const text = typeof data === "string" ? data : data.toString("utf8");
            if (!text)
                return;
            let msg;
            try {
                msg = JSON.parse(text);
            }
            catch (e) {
                logger_1.logger.warn("Non-JSON frame received", { data: text });
                return;
            }
            (_a = this.onCustomMessage) === null || _a === void 0 ? void 0 : _a.call(this, msg);
        };
        this.onClose = (code, reason) => {
            const reasonText = reason.toString("utf8");
            logger_1.logger.warn("WebSocket disconnected", { code, reason: reasonText, autoReconnect: this.autoReconnect });
            this.cleanup();
            this.autoReconnect ? this.attemptReconnect() : this.connectionState = ConnectionState.DISCONNECTED;
        };
        this.baseUrl = options.baseUrl;
        this.pingIntervalInSeconds = options.pingIntervalInSeconds;
        this.onConnect = options.onConnect;
        this.onCustomMessage = options.onMessage;
    }
    clearPingTimeout() {
        if (!this.pingTimeout)
            return;
        clearTimeout(this.pingTimeout);
        this.pingTimeout = null;
    }
    schedulePing() {
        this.clearPingTimeout();
        this.pingTimeout = setTimeout(() => {
            this.ping();
            this.schedulePing();
        }, this.pingIntervalInSeconds * 1000);
    }
    ping() {
        var _a;
        if (!this.ws || this.ws.readyState !== ws_1.WebSocket.OPEN) {
            logger_1.logger.warn(`Socket not open. Ready state is: ${(_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState}`);
            return;
        }
        this.ws.ping((err) => {
            if (err)
                logger_1.logger.error("ping error", { err });
        });
    }
    attemptReconnect() {
        logger_1.logger.warn(`WebSocket reconnecting...`);
        if (this.connectionState === ConnectionState.RECONNECTING)
            return;
        this.connectionState = ConnectionState.RECONNECTING;
        const delay = Math.min(1000 * Math.pow(2, 1), 30000);
        logger_1.logger.info(`Attempting reconnection in ${delay}ms`);
        setTimeout(() => {
            if (this.connectionState === ConnectionState.RECONNECTING)
                this.connect();
        }, delay);
    }
    cleanup() {
        this.clearPingTimeout();
        if (!this.ws)
            return;
        this.ws.removeAllListeners();
        this.ws = null;
    }
    send(msg) {
        var _a, _b;
        if (!this.ws || this.ws.readyState !== ws_1.WebSocket.OPEN)
            throw new Error(`Socket not open. Ready state is: ${(_b = (_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) !== null && _b !== void 0 ? _b : "null"}`);
        this.ws.send(msg, (err) => err ? logger_1.logger.error("send error", { err, msg }) : logger_1.logger.debug("Message sent", { msg }));
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (this.connectionState === ConnectionState.CONNECTING || this.connectionState === ConnectionState.CONNECTED) {
                    reject(new Error("Already connected or connecting"));
                    return;
                }
                this.connectionState = ConnectionState.CONNECTING;
                this.cleanup();
                try {
                    this.ws = new ws_1.WebSocket(this.baseUrl);
                    this.ws.on("open", () => this.onOpen());
                    this.ws.on("message", (data) => this.onMessage(data));
                    this.ws.on("close", (code, reason) => this.onClose(code, reason));
                    this.ws.on("error", (err) => this.onError(err));
                    this.ws.once("open", () => resolve());
                }
                catch (err) {
                    logger_1.logger.error("Failed to create WebSocket", { err });
                    this.connectionState = ConnectionState.DISCONNECTED;
                    reject(new Error("Failed to create WebSocket"));
                }
            });
        });
    }
    reconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.warn("Forcing WebSocket reconnection...");
            this.clearPingTimeout();
            if (this.ws) {
                this.ws.removeAllListeners();
                if (this.ws.readyState === ws_1.WebSocket.OPEN || this.ws.readyState === ws_1.WebSocket.CONNECTING)
                    this.ws.terminate();
                this.ws = null;
            }
            this.connectionState = ConnectionState.DISCONNECTED;
            yield this.connect();
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.info("Manually disconnecting WebSocket");
            this.autoReconnect = false;
            this.connectionState = ConnectionState.DISCONNECTED;
            if (this.ws && this.ws.readyState === ws_1.WebSocket.OPEN) {
                return new Promise((resolve) => {
                    this.ws.once("close", () => {
                        this.cleanup();
                        this.autoReconnect = true;
                        resolve();
                    });
                    this.ws.close(1000, "Client disconnect");
                });
            }
            this.cleanup();
        });
    }
    isConnected() {
        return this.connectionState === ConnectionState.CONNECTED && this.ws !== null && this.ws.readyState === ws_1.WebSocket.OPEN;
    }
}
exports.WsClient = WsClient;
