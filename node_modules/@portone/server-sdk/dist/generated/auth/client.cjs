"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AuthClient = AuthClient;
exports.RefreshTokenError = exports.LoginViaApiSecretError = void 0;
var _AuthError = require("./AuthError.cjs");
var _client = require("../../client.cjs");
function AuthClient(init) {
  const baseUrl = init.baseUrl ?? "https://api.portone.io";
  const secret = init.secret;
  return {
    loginViaApiSecret: async options => {
      const {
        apiSecret
      } = options;
      const requestBody = JSON.stringify({
        apiSecret
      });
      const response = await fetch(new URL("/login/api-secret", baseUrl), {
        method: "POST",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        },
        body: requestBody
      });
      if (!response.ok) {
        throw new LoginViaApiSecretError(await response.json());
      }
      return response.json();
    },
    refreshToken: async options => {
      const {
        refreshToken
      } = options;
      const requestBody = JSON.stringify({
        refreshToken
      });
      const response = await fetch(new URL("/token/refresh", baseUrl), {
        method: "POST",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        },
        body: requestBody
      });
      if (!response.ok) {
        throw new RefreshTokenError(await response.json());
      }
      return response.json();
    }
  };
}
class LoginViaApiSecretError extends _AuthError.AuthError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, LoginViaApiSecretError.prototype);
    this.name = "LoginViaApiSecretError";
  }
}
exports.LoginViaApiSecretError = LoginViaApiSecretError;
class RefreshTokenError extends _AuthError.AuthError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, RefreshTokenError.prototype);
    this.name = "RefreshTokenError";
  }
}
exports.RefreshTokenError = RefreshTokenError;