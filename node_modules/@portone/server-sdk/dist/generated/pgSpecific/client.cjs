"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GetKakaopayPaymentOrderError = void 0;
exports.PgSpecificClient = PgSpecificClient;
var _PgSpecificError = require("./PgSpecificError.cjs");
var _client = require("../../client.cjs");
function PgSpecificClient(init) {
  const baseUrl = init.baseUrl ?? "https://api.portone.io";
  const secret = init.secret;
  return {
    getKakaopayPaymentOrder: async options => {
      const {
        pgTxId,
        channelKey
      } = options;
      const query = [["pgTxId", pgTxId], ["channelKey", channelKey]].flatMap(([key, value]) => value == null ? [] : `${key}=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(new URL(`/kakaopay/payment/order?${query}`, baseUrl), {
        method: "GET",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new GetKakaopayPaymentOrderError(await response.json());
      }
      return response.json();
    }
  };
}
class GetKakaopayPaymentOrderError extends _PgSpecificError.PgSpecificError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, GetKakaopayPaymentOrderError.prototype);
    this.name = "GetKakaopayPaymentOrderError";
  }
}
exports.GetKakaopayPaymentOrderError = GetKakaopayPaymentOrderError;