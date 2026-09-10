"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGNATURE_TYPE = exports.RPC_URL = exports.HOSTS = void 0;
exports.HOSTS = {
    CLOB_API_URL: `https://clob.polymarket.com`,
    GAMMA_API_URL: `https://gamma-api.polymarket.com`,
    CLOB_WS_URL: `wss://ws-subscriptions-clob.polymarket.com/ws`,
    BINANCE_WS_URL: `wss://fstream.binance.com`
};
exports.RPC_URL = "https://polygon-rpc.com";
exports.SIGNATURE_TYPE = {
    EOA: 0,
    CUSTOM_PROXY: 1,
    GNOSIS_SAFE: 2
};
