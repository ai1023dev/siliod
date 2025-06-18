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
            const clientKey = "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";
            const customerKey = data.id + Date.now();
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


        } else {
            $(".login-modal-backdrop").removeClass("hidden");
        }
    },
    error: function (xhr, status, error) {
        alert('서버 측 에러')
    }
});