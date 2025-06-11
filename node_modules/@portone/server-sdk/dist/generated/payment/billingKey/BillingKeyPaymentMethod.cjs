"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isUnrecognizedBillingKeyPaymentMethod = isUnrecognizedBillingKeyPaymentMethod;
function isUnrecognizedBillingKeyPaymentMethod(entity) {
  return entity.type !== "BillingKeyPaymentMethodCard" && entity.type !== "BillingKeyPaymentMethodEasyPay" && entity.type !== "BillingKeyPaymentMethodMobile" && entity.type !== "BillingKeyPaymentMethodPaypal" && entity.type !== "BillingKeyPaymentMethodTransfer";
}