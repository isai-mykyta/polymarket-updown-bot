"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderType = exports.Side = void 0;
var Side;
(function (Side) {
    Side["BUY"] = "BUY";
    Side["SELL"] = "SELL";
})(Side || (exports.Side = Side = {}));
/**
* FOK (Fill or Kill): The order must be filled entirely or not at all.
* FAK (Fill and Kill): The order can be partially filled, and any unfilled portion is canceled.
*/
var OrderType;
(function (OrderType) {
    OrderType["GTC"] = "GTC";
    OrderType["FOK"] = "FOK";
    OrderType["GTD"] = "GTD";
    OrderType["FAK"] = "FAK";
})(OrderType || (exports.OrderType = OrderType = {}));
