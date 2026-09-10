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
exports.BinanceWsClient = void 0;
const constants_1 = require("../constants");
const services_1 = require("../services");
class BinanceWsClient extends services_1.WsClient {
    constructor(options) {
        super({
            baseUrl: `${constants_1.HOSTS.BINANCE_WS_URL}/market/ws/${options.symbol}@aggTrade`,
            pingIntervalInSeconds: 5,
            onMessage: options.onMessage,
            onConnect: () => this.handleConnect(options),
        });
        this.reconnectInProgress = false;
        this.lastReconnectMs = 0;
        this.reconnectCooldownMs = 10000;
    }
    handleConnect(options) {
        var _a;
        (_a = options.onConnect) === null || _a === void 0 ? void 0 : _a.call(options);
    }
    subscribe(options) {
        super.send(JSON.stringify(Object.assign({ type: "subscribe" }, options)));
    }
    unsubscribe(options) {
        super.send(JSON.stringify(Object.assign({ type: "unsubscribe" }, options)));
    }
    reconnectWs(reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            if (this.reconnectInProgress)
                return;
            if (now - this.lastReconnectMs < this.reconnectCooldownMs)
                return;
            this.reconnectInProgress = true;
            this.lastReconnectMs = now;
            try {
                services_1.logger.warn(`Reconnecting Coinbase WS Client: ${reason}`);
                yield this.reconnect();
            }
            catch (err) {
                services_1.logger.warn(`Coinbase WS Client reconnect failed: ${err}`);
            }
            finally {
                this.reconnectInProgress = false;
            }
        });
    }
}
exports.BinanceWsClient = BinanceWsClient;
