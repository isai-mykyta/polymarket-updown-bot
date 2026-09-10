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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const qs_1 = __importDefault(require("qs"));
class ApiClient {
    constructor(options) {
        this.baseUrl = options.baseUrl;
    }
    serializeParams(params) {
        return qs_1.default.stringify(params, { arrayFormat: "comma", encode: false });
    }
    request(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                url: options.path,
                method: options.method,
                baseURL: this.baseUrl,
                params: options.params,
                data: options.data,
                paramsSerializer: this.serializeParams
            };
            if (options.headers) {
                config.headers = Object.assign(Object.assign({}, options.headers), { "Accept": "*/*", "Connection": "keep-alive", "Content-Type": "application/json" });
            }
            const response = yield axios_1.default.request(config);
            return response.data;
        });
    }
    get(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
        });
    }
    post(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
        });
    }
}
exports.ApiClient = ApiClient;
