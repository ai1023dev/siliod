"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CancelCashReceiptError = void 0;
exports.CashReceiptClient = CashReceiptClient;
exports.IssueCashReceiptError = exports.GetCashReceiptsError = exports.GetCashReceiptError = void 0;
var _CashReceiptError = require("./CashReceiptError.cjs");
var _client = require("../../../client.cjs");
function CashReceiptClient(init) {
  const baseUrl = init.baseUrl ?? "https://api.portone.io";
  const secret = init.secret;
  return {
    getCashReceipts: async options => {
      const page = options?.page;
      const sort = options?.sort;
      const filter = options?.filter;
      const requestBody = JSON.stringify({
        page,
        sort,
        filter
      });
      const query = [["requestBody", requestBody]].flatMap(([key, value]) => value == null ? [] : `${key}=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(new URL(`/cash-receipts?${query}`, baseUrl), {
        method: "GET",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new GetCashReceiptsError(await response.json());
      }
      return response.json();
    },
    issueCashReceipt: async options => {
      const {
        storeId,
        paymentId,
        channelKey,
        type,
        orderName,
        currency,
        amount,
        productType,
        customer,
        paidAt,
        businessRegistrationNumber,
        paymentMethod
      } = options;
      const requestBody = JSON.stringify({
        storeId: storeId ?? init.storeId,
        paymentId,
        channelKey,
        type,
        orderName,
        currency,
        amount,
        productType,
        customer,
        paidAt,
        businessRegistrationNumber,
        paymentMethod
      });
      const response = await fetch(new URL("/cash-receipts", baseUrl), {
        method: "POST",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        },
        body: requestBody
      });
      if (!response.ok) {
        throw new IssueCashReceiptError(await response.json());
      }
      return response.json();
    },
    cancelCashReceiptByPaymentId: async options => {
      const {
        paymentId,
        storeId
      } = options;
      const query = [["storeId", storeId]].flatMap(([key, value]) => value == null ? [] : `${key}=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(new URL(`/payments/${encodeURIComponent(paymentId)}/cash-receipt/cancel?${query}`, baseUrl), {
        method: "POST",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new CancelCashReceiptError(await response.json());
      }
      return response.json();
    },
    getCashReceiptByPaymentId: async options => {
      const {
        paymentId,
        storeId
      } = options;
      const query = [["storeId", storeId]].flatMap(([key, value]) => value == null ? [] : `${key}=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(new URL(`/payments/${encodeURIComponent(paymentId)}/cash-receipt?${query}`, baseUrl), {
        method: "GET",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new GetCashReceiptError(await response.json());
      }
      return response.json();
    }
  };
}
class GetCashReceiptsError extends _CashReceiptError.CashReceiptError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, GetCashReceiptsError.prototype);
    this.name = "GetCashReceiptsError";
  }
}
exports.GetCashReceiptsError = GetCashReceiptsError;
class IssueCashReceiptError extends _CashReceiptError.CashReceiptError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, IssueCashReceiptError.prototype);
    this.name = "IssueCashReceiptError";
  }
}
exports.IssueCashReceiptError = IssueCashReceiptError;
class CancelCashReceiptError extends _CashReceiptError.CashReceiptError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, CancelCashReceiptError.prototype);
    this.name = "CancelCashReceiptError";
  }
}
exports.CancelCashReceiptError = CancelCashReceiptError;
class GetCashReceiptError extends _CashReceiptError.CashReceiptError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, GetCashReceiptError.prototype);
    this.name = "GetCashReceiptError";
  }
}
exports.GetCashReceiptError = GetCashReceiptError;