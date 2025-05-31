!function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
posthog.init('phc_8aLLOQWlOi8AVhgzgoWvZP7NiAwMYqVvPMimyxxprjS', { api_host: 'https://us.i.posthog.com' })

const params = new URLSearchParams(window.location.search);
const point = params.get("point")
let amount;

switch (point) {
    case "240":
        amount = '3.24';
        break;
    case "7200":
        amount = '75.6';
        break;
    case "1680":
        amount = '20.16';
        break;
    case "1000":
        amount = '12.75';
        break;
    case "500":
        amount = '6.75';
        break;
    case "150":
        amount = '2.25';
        break;
    case "100":
        amount = '1.5';
        break;
    case "50":
        amount = '0.75';
        break;
    default:
        amount = 'err';
        break;
}


let orderId

$.ajax({
    method: 'GET',
    url: '/login_check',
    success: function (data) {
        console.log(data)
        orderId = data.id + '_' + point + '_USD_' + Date.now()
        console.log(orderId)

        if (data) {
            $(".avatar").attr('src', data.avatar_url);
            $(".username").text(data.name);
            $(".balance-amount").text(data.amount+'p');
        } else {
            $(".login-modal-backdrop").removeClass("hidden");
        }
    },
    error: function (xhr, status, error) {
        alert('Server error')
    }
});



$(".point").html(`<span class="bold">${point}</span>p`)
$(".amount").html(`<span class="bold">${amount}</span>usd`)


async function main() {
    const button = document.getElementById("payment-button");
    // ------  결제위젯 초기화 ------
    const clientKey = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
    const tossPayments = TossPayments(clientKey);

    // 비회원 결제
    const widgets = tossPayments.widgets({ customerKey: TossPayments.ANONYMOUS });

    // ------ 주문의 결제 금액 설정 ------
    await widgets.setAmount({
        currency: "USD",
        value: Number(amount),
    });

    await Promise.all([
        // ------  결제 UI 렌더링 ------
        widgets.renderPaymentMethods({
            selector: "#payment-method",
            variantKey: "PAYPAL",
        }),
        // ------  이용약관 UI 렌더링 ------
        widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
    ]);


    // ------ '결제하기' 버튼 누르면 결제창 띄우기 ------
    button.addEventListener("click", async function () {
        await widgets.requestPayment({
            orderId: orderId,
            orderName: `siliod ${point}p charge`,
            successUrl: window.location.origin + "/?result=success&",
            failUrl: window.location.origin + "/?result=fail&",
        });
    });
} main()