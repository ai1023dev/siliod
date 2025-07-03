!function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
posthog.init('phc_8aLLOQWlOi8AVhgzgoWvZP7NiAwMYqVvPMimyxxprjS', { api_host: 'https://us.i.posthog.com' })

$.ajax({
    method: 'GET',
    url: '/login_check',
    success: function (data) {
        console.log(data)
        if (data) {
            $(".avatar").attr('src', data.avatar_url);
            $(".username").text(data.name);


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
        alert('서버 측 에러')
    }
});


$(document).on('click', '.del-billing', function () {
    $("#payment-method-container").html(
        `<div class="payment-method">
            <div>
                <img src="image/card.svg" alt="신용카드 아이콘" />
                <div>
                    <div class="method-info">결제 수단 등록</div>
                    <div class="method-sub">등록된 결제수단이 없습니다.</div>
                </div>
            </div>
            <div>
                <button class="add-billing blue register-button">등록하기</button>
            </div>
        </div>`
    )
    
    $.ajax({
        method: 'GET',
        url: '/del_card',
        success: function (data) {
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
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
                        <img src="image/card.svg" alt="신용카드 아이콘" />
                        <div>
                            <div class="method-info">결제 수단 · ${data.cardType}카드</div>
                            <div class="method-sub">${data.cardCompany} · ${formatCardNumber(data.cardNumber)}</div>
                        </div>
                    </div>
                    <div>
                        <button class="add-billing register-button">수정하기</button>
                        <button class="del-billing register-button">삭제하기</button>
                    </div>
                </div>`
            )
        } else {
            $("#payment-method-container").html(
                `<div class="payment-method">
                    <div>
                        <img src="image/card.svg" alt="신용카드 아이콘" />
                        <div>
                            <div class="method-info">결제 수단 등록</div>
                            <div class="method-sub">등록된 결제수단이 없습니다.</div>
                        </div>
                    </div>
                    <div>
                        <button class="add-billing blue register-button">등록하기</button>
                    </div>
                </div>`
            )
        }
    },
    error: function (xhr, status, error) {
        alert('서버 측 에러')
    }
});

function formatCardNumber(rawNumber) {
    // *를 X로 변환
    const replaced = rawNumber.replace(/\*/g, 'X');

    // 4자리씩 끊어서 하이픈 추가
    return replaced.replace(/(.{4})(.{4})(.{4})(.{4}?)/, '$1-$2-$3-$4');
}