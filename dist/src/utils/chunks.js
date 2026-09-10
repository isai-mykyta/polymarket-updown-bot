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
exports.executeInChunks = void 0;
const services_1 = require("../services");
const executeInChunks = (amount_1, chunkSize_1, executor_1, ...args_1) => __awaiter(void 0, [amount_1, chunkSize_1, executor_1, ...args_1], void 0, function* (amount, chunkSize, executor, retryUntilSuccess = false) {
    const chunks = [];
    let remaining = amount;
    while (remaining > 0) {
        chunks.push(Math.min(remaining, chunkSize));
        remaining -= chunkSize;
    }
    let failedChunks = [...chunks];
    while (failedChunks.length > 0) {
        const results = yield Promise.allSettled(failedChunks.map(size => executor(size)));
        failedChunks = failedChunks.filter((_, i) => results[i].status === "rejected");
        if (!retryUntilSuccess)
            break;
        if (failedChunks.length > 0) {
            services_1.logger.warn(`⚠️ ${failedChunks.length} chunks failed, retrying...`);
            yield new Promise(resolve => setTimeout(resolve, 500));
        }
    }
});
exports.executeInChunks = executeInChunks;
