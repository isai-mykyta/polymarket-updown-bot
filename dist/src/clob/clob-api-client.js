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
exports.ClobApiClient = void 0;
const clob_client_v2_1 = require("@polymarket/clob-client-v2");
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains");
const constants_1 = require("../constants");
const services_1 = require("../services");
class ClobApiClient {
    constructor() {
        this.clobClient = null;
    }
    initClobClient() {
        return __awaiter(this, void 0, void 0, function* () {
            services_1.logger.info("Initializing Polymarket CLOB client...");
            const account = (0, accounts_1.privateKeyToAccount)(process.env.EOA_PRIVATE_KEY);
            const signer = (0, viem_1.createWalletClient)({
                account,
                chain: chains_1.polygon,
                transport: (0, viem_1.http)(constants_1.RPC_URL),
            });
            const options = {
                host: constants_1.HOSTS.CLOB_API_URL,
                chain: clob_client_v2_1.Chain.POLYGON,
                signer,
                signatureType: constants_1.SIGNATURE_TYPE.CUSTOM_PROXY,
                funderAddress: process.env.POLYMARKET_FUNDER,
            };
            const tempClient = new clob_client_v2_1.ClobClient(options);
            const creds = yield tempClient.createOrDeriveApiKey();
            this.clobClient = new clob_client_v2_1.ClobClient(Object.assign(Object.assign({}, options), { creds }));
            services_1.logger.info("Polymarket CLOB client initialized");
        });
    }
    getPolymarketClient() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.clobClient)
                return this.clobClient;
            yield this.initClobClient();
            return this.clobClient;
        });
    }
    createMarketOrder(order) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.getPolymarketClient();
            const result = yield client.createAndPostMarketOrder(order);
            if ((result === null || result === void 0 ? void 0 : result.status) !== "matched")
                throw new Error(`Failed to create market order: ${JSON.stringify(result)}`);
            return result;
        });
    }
}
exports.ClobApiClient = ClobApiClient;
