"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isUnrecognizedAddress = isUnrecognizedAddress;
function isUnrecognizedAddress(entity) {
  return entity.type !== "ONE_LINE" && entity.type !== "SEPARATED";
}