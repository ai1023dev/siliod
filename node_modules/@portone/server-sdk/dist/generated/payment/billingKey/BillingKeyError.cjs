"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BillingKeyError = void 0;
var _PaymentError = require("../PaymentError.cjs");
class BillingKeyError extends _PaymentError.PaymentError {}
exports.BillingKeyError = BillingKeyError;