"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AuthError = void 0;
var _RestError = require("../RestError.cjs");
class AuthError extends _RestError.RestError {}
exports.AuthError = AuthError;