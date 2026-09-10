"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketClobWsClient = void 0;
const constants_1 = require("../constants");
const services_1 = require("../services");
const { CLOB_WS_URL } = constants_1.HOSTS;
class ClobWsClient extends services_1.WsClient {
    constructor(options) {
        super({
            baseUrl: `${CLOB_WS_URL}${options.path}`,
            pingIntervalInSeconds: 5,
            onMessage: options.onMessage,
            onConnect: () => this.handleConnect(options),
        });
        this.lastSubscription = null;
    }
    handleConnect(options) {
        var _a;
        if (this.lastSubscription)
            this.subscribe(this.lastSubscription);
        (_a = options.onConnect) === null || _a === void 0 ? void 0 : _a.call(options);
    }
    subscribe(options) {
        this.lastSubscription = options;
        super.send(JSON.stringify(Object.assign({ operation: "subscribe" }, options)));
    }
    unsubscribe(options) {
        super.send(JSON.stringify(Object.assign({ action: "unsubscribe" }, options)));
    }
}
class MarketClobWsClient extends ClobWsClient {
    constructor(options) {
        super({
            path: "/market",
            onConnect: options.onConnect,
            onMessage: options.onMessage,
        });
    }
}
exports.MarketClobWsClient = MarketClobWsClient;
