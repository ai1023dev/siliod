!function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
posthog.init('phc_8aLLOQWlOi8AVhgzgoWvZP7NiAwMYqVvPMimyxxprjS', { api_host: 'https://us.i.posthog.com' })

const params = new URLSearchParams(window.location.search);
const instance_id = params.get("instance");

// ✅ 사용자에게 보이는 텍스트만 영어로 변경
$('h3').text('Backup Shell - ' + instance_id)

$.ajax({
    method: 'POST',
    url: `/instance_info_ip`,
    data: { instance_id },
    success: function (data) {
        console.log(data); // Example: "3.144.7.85"

        if (data) {
            const ip = data; // Retrieved IP

            // WebSocket connection
            const ws = new WebSocket('wss://siliod.com');

            const output = document.getElementById('output');

            ws.onmessage = (e) => {
                const msg = e.data.trim();

                // Ignore unnecessary messages
                if (msg.includes('[SSH 종료 코드: null]') || msg.includes('[⛔ 실행 중단 요청됨]')) return;

                // Display message at the top
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
            alert('Instance is not running');
        }
    },
    error: function (xhr, status, error) {
        alert('Server-side error');
    }
});