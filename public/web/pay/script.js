main();


async function main() {
    const button = document.getElementById("payment-button");
    // ------  결제위젯 초기화 ------
    const clientKey = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
    const tossPayments = TossPayments(clientKey);

    // 비회원 결제
    const widgets = tossPayments.widgets({ customerKey: TossPayments.ANONYMOUS });

    // ------ 주문의 결제 금액 설정 ------
    await widgets.setAmount({
        currency: "KRW",
        value: 1000,
    });

    await Promise.all([
        // ------  결제 UI 렌더링 ------
        widgets.renderPaymentMethods({
            selector: "#payment-method",
            variantKey: "DEFAULT",
        }),
        // ------  이용약관 UI 렌더링 ------
        widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
    ]);


    const ran1 = Math.random();
    const ran2 = Math.random();
    const ran_orderId = String(ran1).replace('.', '') + String(ran2).replace('.', '');


    // ------ '결제하기' 버튼 누르면 결제창 띄우기 ------
    button.addEventListener("click", async function () {
        await widgets.requestPayment({
            orderId: ran_orderId,
            orderName: "SwAP",
            successUrl: window.location.origin + "/remittance/pay/success",
            failUrl: window.location.origin + "/remittance/pay/fail",
        });
    });
}