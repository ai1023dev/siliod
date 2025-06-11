"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isUnrecognizedBillingKeyInfo = isUnrecognizedBillingKeyInfo;
function isUnrecognizedBillingKeyInfo(entity) {
  return entity.status !== "DELETED" && entity.status !== "ISSUED";
}