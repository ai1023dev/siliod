"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isUnrecognizedIdentityVerification = isUnrecognizedIdentityVerification;
function isUnrecognizedIdentityVerification(entity) {
  return entity.status !== "FAILED" && entity.status !== "READY" && entity.status !== "VERIFIED";
}