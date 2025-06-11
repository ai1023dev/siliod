"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CashReceiptError = void 0;
var _PaymentError = require("../PaymentError.cjs");
class CashReceiptError extends _PaymentError.PaymentError {}
exports.CashReceiptError = CashReceiptError;