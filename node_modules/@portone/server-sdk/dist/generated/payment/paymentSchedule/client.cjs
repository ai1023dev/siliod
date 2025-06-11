"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GetPaymentSchedulesError = exports.GetPaymentScheduleError = exports.CreatePaymentScheduleError = void 0;
exports.PaymentScheduleClient = PaymentScheduleClient;
exports.RevokePaymentSchedulesError = void 0;
var _PaymentScheduleError = require("./PaymentScheduleError.cjs");
var _client = require("../../../client.cjs");
function PaymentScheduleClient(init) {
  const baseUrl = init.baseUrl ?? "https://api.portone.io";
  const secret = init.secret;
  return {
    getPaymentSchedule: async options => {
      const {
        paymentScheduleId,
        storeId
      } = options;
      const query = [["storeId", storeId]].flatMap(([key, value]) => value == null ? [] : `${key}=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(new URL(`/payment-schedules/${encodeURIComponent(paymentScheduleId)}?${query}`, baseUrl), {
        method: "GET",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new GetPaymentScheduleError(await response.json());
      }
      return response.json();
    },
    getPaymentSchedules: async options => {
      const page = options?.page;
      const sort = options?.sort;
      const filter = options?.filter;
      const requestBody = JSON.stringify({
        page,
        sort,
        filter
      });
      const query = [["requestBody", requestBody]].flatMap(([key, value]) => value == null ? [] : `${key}=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(new URL(`/payment-schedules?${query}`, baseUrl), {
        method: "GET",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new GetPaymentSchedulesError(await response.json());
      }
      return response.json();
    },
    revokePaymentSchedules: async options => {
      const storeId = options?.storeId;
      const billingKey = options?.billingKey;
      const scheduleIds = options?.scheduleIds;
      const requestBody = JSON.stringify({
        storeId: storeId ?? init.storeId,
        billingKey,
        scheduleIds
      });
      const query = [["requestBody", requestBody]].flatMap(([key, value]) => value == null ? [] : `${key}=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(new URL(`/payment-schedules?${query}`, baseUrl), {
        method: "DELETE",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        }
      });
      if (!response.ok) {
        throw new RevokePaymentSchedulesError(await response.json());
      }
      return response.json();
    },
    createPaymentSchedule: async options => {
      const {
        paymentId,
        payment,
        timeToPay
      } = options;
      const requestBody = JSON.stringify({
        payment,
        timeToPay
      });
      const response = await fetch(new URL(`/payments/${encodeURIComponent(paymentId)}/schedule`, baseUrl), {
        method: "POST",
        headers: {
          Authorization: `PortOne ${secret}`,
          "User-Agent": _client.USER_AGENT
        },
        body: requestBody
      });
      if (!response.ok) {
        throw new CreatePaymentScheduleError(await response.json());
      }
      return response.json();
    }
  };
}
class GetPaymentScheduleError extends _PaymentScheduleError.PaymentScheduleError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, GetPaymentScheduleError.prototype);
    this.name = "GetPaymentScheduleError";
  }
}
exports.GetPaymentScheduleError = GetPaymentScheduleError;
class GetPaymentSchedulesError extends _PaymentScheduleError.PaymentScheduleError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, GetPaymentSchedulesError.prototype);
    this.name = "GetPaymentSchedulesError";
  }
}
exports.GetPaymentSchedulesError = GetPaymentSchedulesError;
class RevokePaymentSchedulesError extends _PaymentScheduleError.PaymentScheduleError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, RevokePaymentSchedulesError.prototype);
    this.name = "RevokePaymentSchedulesError";
  }
}
exports.RevokePaymentSchedulesError = RevokePaymentSchedulesError;
class CreatePaymentScheduleError extends _PaymentScheduleError.PaymentScheduleError {
  /** @ignore */
  constructor(data) {
    super(data);
    Object.setPrototypeOf(this, CreatePaymentScheduleError.prototype);
    this.name = "CreatePaymentScheduleError";
  }
}
exports.CreatePaymentScheduleError = CreatePaymentScheduleError;