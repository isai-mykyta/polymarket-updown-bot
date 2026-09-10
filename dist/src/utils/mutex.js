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
exports.Mutex = void 0;
class Mutex {
    constructor() {
        this.locked = false;
        this.queue = [];
    }
    acquire() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.locked) {
                this.locked = true;
                return;
            }
            return new Promise((resolve) => this.queue.push(resolve));
        });
    }
    release() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next === null || next === void 0 ? void 0 : next();
        }
        else {
            this.locked = false;
        }
    }
    runExclusive(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.acquire();
            try {
                return yield fn();
            }
            finally {
                this.release();
            }
        });
    }
    isLocked() {
        return this.locked;
    }
}
exports.Mutex = Mutex;
