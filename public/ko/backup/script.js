<<<<<<< HEAD
=======
!function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
posthog.init('phc_8aLLOQWlOi8AVhgzgoWvZP7NiAwMYqVvPMimyxxprjS', { api_host: 'https://us.i.posthog.com' })

>>>>>>> 239e58cab503fae7a1aa6e19e4dae140c16bb074
const params = new URLSearchParams(window.location.search);
const instance_id = params.get("instance")
$('h3').text('백업용 쉘 - ' + instance_id)

$.ajax({
    method: 'POST',
    url: `/instance_info_ip`,
    data: { instance_id },
    success: function (data) {
        console.log(data); // 예: "3.144.7.85"

        if (data) {
            const ip = data; // 받아온 IP

            // WebSocket 연결
<<<<<<< HEAD
            const ws = new WebSocket('ws://localhost:8000');
=======
            const ws = new WebSocket('wss://siliod.com');
>>>>>>> 239e58cab503fae7a1aa6e19e4dae140c16bb074

            const output = document.getElementById('output');

            ws.onmessage = (e) => {
                const msg = e.data.trim();

                // 불필요한 메시지 무시
                if (msg.includes('[SSH 종료 코드: null]') || msg.includes('[⛔ 실행 중단 요청됨]')) return;

                // 메시지를 위로 출력
                const line = document.createElement('div');
                line.textContent = msg;
                output.prepend(line);
            };

            document.getElementById('run').onclick = () => {
                const cmd = document.getElementById('cmd').value.trim();
                if (cmd) {
                    ws.send(JSON.stringify({ type: 'run', ip: ip, command: cmd }));
                }
            };

            document.getElementById('stop').onclick = () => {
                ws.send(JSON.stringify({ type: 'stop' }));
            };
        } else {
            alert('인스턴스가 실행되지 않음');
        }
    },
    error: function (xhr, status, error) {
        alert('서버 측 에러')
    }
});