"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isUnrecognizedChannelSpecificFailure = isUnrecognizedChannelSpecificFailure;
function isUnrecognizedChannelSpecificFailure(entity) {
  return entity.type !== "INVALID_REQUEST" && entity.type !== "PG_PROVIDER";
}