!function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
posthog.init('phc_8aLLOQWlOi8AVhgzgoWvZP7NiAwMYqVvPMimyxxprjS', { api_host: 'https://us.i.posthog.com' })

const today = new Date();
let year = today.getFullYear();
let month = today.getMonth() + 1; // 0~11 → 1~12

if (month === 12) {
  year += 1;
  month = 1;
} else {
  month += 1;
}

const nextMonthFirst = `${year}-${String(month).padStart(2, '0')}-01 Payment Scheduled`;
$(".date").text(nextMonthFirst);


$.ajax({
    method: 'GET',
    url: '/login_check',
    success: function (data) {
        console.log(data)
        if (data) {
            $(".avatar").attr('src', data.avatar_url);
            $(".username").text(data.name);
            $(".amount").text(data.amount + ' KRW');


            // ------  SDK 초기화 ------
            // @docs https://docs.tosspayments.com/sdk/v2/js#토스페이먼츠-초기화
            const clientKey = "test_ck_24xLea5zVAoXW5JxPzRm8QAMYNwW";
            const customerKey = data.id + '-' + Date.now();
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
                    successUrl: window.location.origin + "/billing/success", // 요청이 성공하면 리다이렉트되는 URL
                    failUrl: window.location.origin + "/billing/fail", // 요청이 실패하면 리다이렉트되는 URL
                    customerEmail: data.email
                });
            }



            $(document).on('click', '.add-billing', function () {
                requestBillingAuth()
            })


        } else {
            $(".login-modal-backdrop").removeClass("hidden");
        }
    },
    error: function (xhr, status, error) {
        alert('Server Error')
    }
});


$(document).on('click', '.del-billing', function () {
    $("#payment-method-container").html(
        `<div class="payment-method">
            <div>
                <img src="image/card.svg" alt="Credit Card Icon" />
                <div>
                    <div class="method-info">Register Payment Method</div>
                    <div class="method-sub">No registered payment method.</div>
                </div>
            </div>
            <div>
                <button class="add-billing blue register-button">Register</button>
            </div>
        </div>`
    )
    
    $.ajax({
        method: 'GET',
        url: '/del_card',
        success: function (data) {
        },
        error: function (xhr, status, error) {
            alert('Server Error')
        }
    });
})

$.ajax({
    method: 'GET',
    url: '/get_card',
    success: function (data) {
        if (data) {
            $("#payment-method-container").html(
                `<div class="payment-method">
                    <div>
                        <img src="image/card.svg" alt="Credit Card Icon" />
                        <div>
                            <div class="method-info">Payment Method · ${data.cardType} Card</div>
                            <div class="method-sub">${data.cardCompany} · ${formatCardNumber(data.cardNumber)}</div>
                        </div>
                    </div>
                    <div>
                        <button class="add-billing register-button">Edit</button>
                        <button class="del-billing register-button">Delete</button>
                    </div>
                </div>`
            )
        } else {
            $("#payment-method-container").html(
                `<div class="payment-method">
                    <div>
                        <img src="image/card.svg" alt="Credit Card Icon" />
                        <div>
                            <div class="method-info">Register Payment Method</div>
                            <div class="method-sub">No registered payment method.</div>
                        </div>
                    </div>
                    <div>
                        <button class="add-billing blue register-button">Register</button>
                    </div>
                </div>`
            )
        }
    },
    error: function (xhr, status, error) {
        alert('Server Error')
    }
});

function formatCardNumber(rawNumber) {
    // *를 X로 변환
    const replaced = rawNumber.replace(/\*/g, 'X');

    // 4자리씩 끊어서 하이픈 추가
    return replaced.replace(/(.{4})(.{4})(.{4})(.{4}?)/, '$1-$2-$3-$4');
}



function calculateMonthlyFee() {
        const hourlyRate = parseInt($('#instance-price').val()) || 0;
        const hours = parseInt($('#planned-hours').val()) || 0;
        const storage = parseInt($('#storage-size').val()) || 0;

        const baseFee = hourlyRate * hours;

        const extraStorageGiB = Math.max(0, storage - 8);
        const weeklyExtraFee = extraStorageGiB * 30;  // 매주 월요일마다 30원
        const monthlyExtraFee = weeklyExtraFee * 4;    // 월 기준: 4주

        const total = baseFee + monthlyExtraFee;

        $('#monthly-fee').text(total.toLocaleString() + " KRW");
    }

    $('#instance-price, #planned-hours, #storage-size').on('input', calculateMonthlyFee);