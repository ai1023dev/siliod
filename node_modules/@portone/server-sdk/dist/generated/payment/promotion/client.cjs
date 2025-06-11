"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GetPromotionError = void 0;
exports.PromotionClient = PromotionClient;
var _PromotionError = require("./PromotionError.cjs");
var _client = require("../../../client.cjs");
function PromotionClient(init) {
  const baseUrl = init.baseUrl ?? "https://api.portone.io";
  const secret = init.secret;
  return {
    getPromotion: async options => {
      const {
        promotionId
      } = options;
      const response = await fetch(new URL(`/promotions/${encodeURIComponent(promotionId)}`, baseUrl), {
        method: "GET",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new GetPromotionError(await response.json());
      }
      return response.json();
    }
  };
}
class GetPromotionError extends _PromotionError.PromotionError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, GetPromotionError.prototype);
    this.name = "GetPromotionError";
  }
}
exports.GetPromotionError = GetPromotionError;