let orderId

$.ajax({
    method: 'GET',
    url: '/login_check',
    success: function (data) {
        console.log(data)
        orderId = data.id + '_' +Date.now()
        console.log(orderId)

        if (data) {
            $(".avatar").attr('src', data.avatar_url);
            $(".username").text(data.name);
        } else {
            $(".login-modal-backdrop").removeClass("hidden");
        }
    },
    error: function (xhr, status, error) {
        alert('서버 측 에러')
    }
});

const params = new URLSearchParams(window.location.search);
const amount = params.get("amount")

$("h1").text(amount);


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
        value: Number(amount),
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


    // ------ '결제하기' 버튼 누르면 결제창 띄우기 ------
    button.addEventListener("click", async function () {
        await widgets.requestPayment({
            orderId: orderId,
            orderName: "siliod 충전",
            successUrl: window.location.origin + "/?result=success&",
            failUrl: window.location.origin + "/?result=fail&",
        });
    });
} main()