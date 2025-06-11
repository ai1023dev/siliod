"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isUnrecognizedBillingKeyPaymentMethodEasyPayMethod = isUnrecognizedBillingKeyPaymentMethodEasyPayMethod;
function isUnrecognizedBillingKeyPaymentMethodEasyPayMethod(entity) {
  return entity.type !== "BillingKeyPaymentMethodCard" && entity.type !== "BillingKeyPaymentMethodEasyPayCharge" && entity.type !== "BillingKeyPaymentMethodTransfer";
}