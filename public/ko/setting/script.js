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
            $(".balance-amount").text(data.amount + 'p');
        } else {
            $(".login-modal-backdrop").removeClass("hidden");
        }
    },
    error: function (xhr, status, error) {
        alert('서버 측 에러')
    }
});

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatAmount(amount) {
    return amount.toLocaleString('ko-KR');
}

$.ajax({
    method: 'GET',
    url: '/receipt',
    success: function (data) {
        console.log(data)
        const $container = $('.receipt-container');

        data.forEach(item => {
            const html = `
                <div class="receipt">
                    <div>${formatDate(item.date)}</div>
                    <div class="receipt-bottom">
                        <span class="point">${item.point}p</span>
                        <span>${formatAmount(item.amount)} ${item.currency}</span>
                    </div>
                </div>
            `;
            $container.prepend(html);
        });
    },
    error: function (xhr, status, error) {
        alert('서버 측 에러')
    }
});


$('.logout').click(function () {
    $.ajax({
        method: 'GET',
        url: 'logout',
        success: function (data) {
            window.location.href = '/';
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
        }
    });
})

$('select').change(function () {
    console.log($('select').val())
    $.ajax({
        method: 'POST',
        url: 'change_language',
        data: { language: $('select').val() },
        success: function (data) {
            location.reload(true);
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
        }
    });
})