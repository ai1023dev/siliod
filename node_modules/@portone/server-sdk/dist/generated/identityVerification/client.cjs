"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GetIdentityVerificationsError = exports.GetIdentityVerificationError = exports.ConfirmIdentityVerificationError = void 0;
exports.IdentityVerificationClient = IdentityVerificationClient;
exports.SendIdentityVerificationError = exports.ResendIdentityVerificationError = void 0;
var _IdentityVerificationError = require("./IdentityVerificationError.cjs");
var _client = require("../../client.cjs");
function IdentityVerificationClient(init) {
  const baseUrl = init.baseUrl ?? "https://api.portone.io";
  const secret = init.secret;
  return {
    confirmIdentityVerification: async options => {
      const {
        identityVerificationId,
        storeId,
        otp
      } = options;
      const requestBody = JSON.stringify({
        storeId: storeId ?? init.storeId,
        otp
      });
      const response = await fetch(new URL(`/identity-verifications/${encodeURIComponent(identityVerificationId)}/confirm`, baseUrl), {
        method: "POST",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        },
        body: requestBody
      });
      if (!response.ok) {
        throw new ConfirmIdentityVerificationError(await response.json());
      }
      return response.json();
    },
    resendIdentityVerification: async options => {
      const {
        identityVerificationId,
        storeId
      } = options;
      const query = [["storeId", storeId]].flatMap(([key, value]) => value == null ? [] : `${key}=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(new URL(`/identity-verifications/${encodeURIComponent(identityVerificationId)}/resend?${query}`, baseUrl), {
        method: "POST",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new ResendIdentityVerificationError(await response.json());
      }
      return response.json();
    },
    sendIdentityVerification: async options => {
      const {
        identityVerificationId,
        storeId,
        channelKey,
        customer,
        customData,
        bypass,
        operator,
        method
      } = options;
      const requestBody = JSON.stringify({
        storeId: storeId ?? init.storeId,
        channelKey,
        customer,
        customData,
        bypass,
        operator,
        method
      });
      const response = await fetch(new URL(`/identity-verifications/${encodeURIComponent(identityVerificationId)}/send`, baseUrl), {
        method: "POST",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        },
        body: requestBody
      });
      if (!response.ok) {
        throw new SendIdentityVerificationError(await response.json());
      }
      return response.json();
    },
    getIdentityVerification: async options => {
      const {
        identityVerificationId,
        storeId
      } = options;
      const query = [["storeId", storeId]].flatMap(([key, value]) => value == null ? [] : `${key}=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(new URL(`/identity-verifications/${encodeURIComponent(identityVerificationId)}?${query}`, baseUrl), {
        method: "GET",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new GetIdentityVerificationError(await response.json());
      }
      return response.json();
    },
    getIdentityVerifications: async options => {
      const page = options?.page;
      const sort = options?.sort;
      const filter = options?.filter;
      const requestBody = JSON.stringify({
        page,
        sort,
        filter
      });
      const query = [["requestBody", requestBody]].flatMap(([key, value]) => value == null ? [] : `${key}=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(new URL(`/identity-verifications?${query}`, baseUrl), {
        method: "GET",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new GetIdentityVerificationsError(await response.json());
      }
      return response.json();
    }
  };
}
class ConfirmIdentityVerificationError extends _IdentityVerificationError.IdentityVerificationError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, ConfirmIdentityVerificationError.prototype);
    this.name = "ConfirmIdentityVerificationError";
  }
}
exports.ConfirmIdentityVerificationError = ConfirmIdentityVerificationError;
class ResendIdentityVerificationError extends _IdentityVerificationError.IdentityVerificationError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, ResendIdentityVerificationError.prototype);
    this.name = "ResendIdentityVerificationError";
  }
}
exports.ResendIdentityVerificationError = ResendIdentityVerificationError;
class SendIdentityVerificationError extends _IdentityVerificationError.IdentityVerificationError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, SendIdentityVerificationError.prototype);
    this.name = "SendIdentityVerificationError";
  }
}
exports.SendIdentityVerificationError = SendIdentityVerificationError;
class GetIdentityVerificationError extends _IdentityVerificationError.IdentityVerificationError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, GetIdentityVerificationError.prototype);
    this.name = "GetIdentityVerificationError";
  }
}
exports.GetIdentityVerificationError = GetIdentityVerificationError;
class GetIdentityVerificationsError extends _IdentityVerificationError.IdentityVerificationError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, GetIdentityVerificationsError.prototype);
    this.name = "GetIdentityVerificationsError";
  }
}
exports.GetIdentityVerificationsError = GetIdentityVerificationsError;