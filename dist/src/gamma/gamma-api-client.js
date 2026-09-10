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
exports.GammaApiClient = void 0;
const constants_1 = require("../constants");
const services_1 = require("../services");
const { GAMMA_API_URL } = constants_1.HOSTS;
class GammaApiClient extends services_1.ApiClient {
    constructor() {
        super({ baseUrl: GAMMA_API_URL });
    }
    getMarkets() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            return this.get({
                path: "/markets",
                params: options,
                headers: {
                    "Accept-Encoding": "gzip",
                    "User-Agent": `@polymarket/clob-client`
                }
            });
        });
    }
}
exports.GammaApiClient = GammaApiClient;
