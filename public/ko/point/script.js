// ------  SDK 초기화 ------
// @docs https://docs.tosspayments.com/sdk/v2/js#토스페이먼츠-초기화
const clientKey = "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";
const customerKey = 'dsafdsfdsgfdgsd'+Date.now();
const tossPayments = TossPayments(clientKey);
// 회원 결제
// @docs https://docs.tosspayments.com/sdk/v2/js#tosspaymentspayment
const payment = tossPayments.payment({ customerKey });
// 비회원 결제
// const payment = tossPayments.payment({customerKey: TossPayments.ANONYMOUS})
// ------ '카드 등록하기' 버튼 누르면 결제창 띄우기 ------
// @docs https://docs.tosspayments.com/sdk/v2/js#paymentrequestpayment
async function requestBillingAuth() {
    await payment.requestBillingAuth({
        method: "CARD", // 자동결제(빌링)는 카드만 지원합니다
        successUrl: window.location.origin + "/", // 요청이 성공하면 리다이렉트되는 URL
        failUrl: window.location.origin + "/fail", // 요청이 실패하면 리다이렉트되는 URL
        customerEmail: "customer123@gmail.com"
    });
}



$('#payment-button').click(function () {
    requestBillingAuth()
})