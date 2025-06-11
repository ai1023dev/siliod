"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isUnrecognizedCashReceipt = isUnrecognizedCashReceipt;
function isUnrecognizedCashReceipt(entity) {
  return entity.status !== "CANCELLED" && entity.status !== "ISSUED" && entity.status !== "ISSUE_FAILED";
}