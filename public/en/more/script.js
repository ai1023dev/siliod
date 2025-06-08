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
            $(".balance-amount").text(data.amount+'p');
        } else {
            $(".login-modal-backdrop").removeClass("hidden");
        }
    },
    error: function (xhr, status, error) {
        alert('Server error')
    }
});

const params = new URLSearchParams(window.location.search);
const instance_id = params.get("id")
console.log(instance_id)

let port_info
function main_data() {
    $('#instance-id').text(instance_id)
    $('#instance-connect-url').text(instance_id + '.siliod.com')
    $('#instance-connect-url').attr('href', 'https://' + instance_id + '.siliod.com')
    $('#backup-ssh').attr('href', 'http://localhost:8080/backup?instance=' + instance_id)

    $.ajax({
        method: 'POST',
        url: `/instance_info`,
        data: { instance_id },
        success: function (data) {
            console.log(data);
            
            $('.instance-name').text(data.instance.name)
            if (data.instance.type) {
                $('#instance-type-label').text('GUI')
            } else {
                $('#instance-type-label').text('CLI')
            }
            $('#instance-type').text(data.instance.grade)

            $('#private-ip').text(data.instance.private_ip)
            $('#instance-status-loading').text(data.state)
            $('#instance-status-loading').removeClass('loading')
            $('#storage-input').val(data.instance.size)
            $('#storage-input').attr('min', data.instance.size)

            $('.status-' + instance_id).text(data.state)

            console.log(data.state)
            if (data.state === 'running') {
                $('#instance-status-loading').addClass('running')
            } else {
                $('#instance-status-loading').addClass('stopped')
            }
        },
        error: function (xhr, status, error) {
            alert('Server error')
        }
    });

    $.ajax({
        method: 'POST',
        url: `/instance_info_ip`,
        data: { instance_id },
        success: function (data) {
            console.log(data);
            if (data) {
                $('#public-ip').text(data)
            } else {
                $('#public-ip').text('Instance not started')
            }
        },
        error: function (xhr, status, error) {
            alert('Server error')
        }
    });

    $.ajax({
        method: 'POST',
        url: `/port_info`,
        data: { instance_id },
        success: function (data) {
            console.log(data);
            $('.main-section').css('opacity', '1')
            $('#loading-overlay').hide();

            port_info = data
            $('#rules-container').empty();

            for (let i = 0; i < data.length; i++) {
                createRule(i, data[i])
            }
        },
        error: function (xhr, status, error) {
            alert('Server error')
        }
    });
}

main_data()

$('#refresh').click(function () {
    $('#loading-overlay').show();
    $('.main-section').css('opacity', '0.5')

    $('#instance-status-loading').text('loading')
    $('#instance-status-loading').addClass('loading')
    $('#instance-status-loading').removeClass('running')
    $('#instance-status-loading').removeClass('stopped')

    $('#public-ip').text('Loading')

    main_data()
})

$('#delete-incetance').click(function () {
    if (confirm("Are you sure you want to delete this instance?")) {
        $.ajax({
            method: 'POST',
            url: `/delete_instance`,
            data: { instance_id },
            success: function (data) {
                window.location.href = window.location.origin;
            },
            error: function (xhr, status, error) {
                alert('Server error')
            }
        });
    }
})

$('#resize-volume').click(function () {
    if (confirm("Are you sure you want to change the volume size? For storage exceeding 8GiB, 1 point is consumed per hour for each additional 1GiB.")) {
        const size = $('#storage-input').val();

        $.ajax({
            method: 'POST',
            url: `/resize_volume`,
            data: { instance_id, size },
            success: function (data) {
                console.log(data)
                if (data !== '6time err') {
                    alert('Volume size changed successfully.');
                    // window.location.href = window.location.origin + '/가이드/대충 볼륨 연결하는거';
                } else {
                    alert("You've reached the maximum modification rate per volume limit. Wait at least 6 hours between modifications per volume.");
                }
            },
            error: function (xhr, status, error) {
                if (xhr.status === 429 && xhr.responseJSON?.message) {
                    alert(xhr.responseJSON.message); // 6시간 제한 메시지
                } else if (xhr.responseJSON?.message) {
                    alert('Error: ' + xhr.responseJSON.message); // 기타 서버 측 메시지
                } else {
                    alert('Server error');
                }
            }
        });
    }
});



let my_ip
$.ajax({
    method: 'GET',
    url: `https://api.ipify.org?format=json`,
    success: function (data) {
        my_ip = data.ip + '/32'
    },
    error: function (xhr, status, error) {
        alert('Server error');
    }
});


function createRule(i, rule = {}) {
    const protocol = rule.protocol?.toUpperCase() || 'TCP';
    const portRange = (rule.fromPort !== undefined && rule.toPort !== undefined)
        ? (rule.fromPort === rule.toPort ? `${rule.fromPort}` : `${rule.fromPort}-${rule.toPort}`)
        : '';
    const source = rule.sources?.[0] || '0.0.0.0/0';
    const isCustomIP = source !== '0.0.0.0/0';

    const ruleHtml = `
        <div class="rule-list">
            <div class="form-rule" data-field="${i}">
                <div class="form-group">
                    <label>Protocol</label>
                    <select class="protocol">
                        <option value="tcp" ${protocol === 'TCP' ? 'selected' : ''}>TCP</option>
                        <option value="udp" ${protocol === 'UDP' ? 'selected' : ''}>UDP</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Port Range (Use '-' for ranges)</label>
                    <input type="text" class="port-range" placeholder="e.g., 80 or 1000-2000" value="${portRange}">
                </div>
                <div class="form-group">
                    <label>Allowed IP (CIDR notation required)</label>
                    <select class="allowed-ip-option">
                        <option value="0.0.0.0/0" ${!isCustomIP ? 'selected' : ''}>Allow all IPs (0.0.0.0/0)</option>
                        <option value="custom" ${isCustomIP ? 'selected' : ''}>Custom IP</option>
                    </select>
                    <input type="text" class="custom-ip" placeholder="Enter IP" value="${isCustomIP ? source : my_ip}" style="${isCustomIP ? '' : 'display:none;'}">
                </div>
                ${rule.protocol ? '<button class="remove-port-btn">Delete</button>' : '<button class="add-port-btn">Add</button>'}
            </div>
        </div>
    `;

    $('#rules-container').append(ruleHtml);
}


// 규칙 추가
$('#add-rule').click(function () {
    createRule();
});

// 동적으로 추가된 요소에도 이벤트 적용
$('#rules-container').on('change', '.allowed-ip-option', function () {
    const selected = $(this).val();
    const specificIpInput = $(this).siblings('.custom-ip');
    if (selected === 'custom') {
        specificIpInput.show();
    } else {
        specificIpInput.hide();
    }
});

$('#rules-container').on('input change', '.form-rule .protocol, .form-rule .port-range, .form-rule .allowed-ip-option, .form-rule .custom-ip', function () {
    const $form = $(this).closest('.form-rule');
    const $button = $form.find('button');

    if ($button.hasClass('remove-port-btn')) {
        $button
            .removeClass('remove-port-btn')
            .addClass('edit-port-btn')
            .text('Edit');
    }
});


$('#rules-container').on('click', '.add-port-btn', function () {
    const $form = $(this).closest('.form-rule');
    const protocol = $form.find('.protocol').val();
    const portRange = $form.find('.port-range').val();
    const allowedOption = $form.find('.allowed-ip-option').val();
    const customIP = allowedOption === 'custom' ? $form.find('.custom-ip').val() : allowedOption;

    console.log('Protocol:', protocol);
    console.log('Port Range:', portRange);
    console.log('Allowed IP:', customIP);

    if (!isValidPortRange(portRange)) {
        alert('Invalid port range format.');
        return;
    }

    if (!isValidCIDR(customIP)) {
        alert('Invalid IP address format.');
        return;
    }

    // 포트 범위 파싱
    let fromPort, toPort;
    if (portRange.includes('-')) {
        const [from, to] = portRange.split('-').map(p => parseInt(p, 10));
        fromPort = from;
        toPort = to;
    } else {
        fromPort = toPort = parseInt(portRange, 10);
    }

    // 결과 객체 구성
    const rule = {
        protocol: protocol,
        fromPort: fromPort,
        toPort: toPort,
        sources: [customIP]
    };


    $.ajax({
        method: 'POST',
        url: `/add_port`,
        data: { instance_id, rule },
        success: function (data) {
            $('#loading-overlay').show();
            $('.main-section').css('opacity', '0.5')

            $('#instance-status-loading').text('loading')
            $('#instance-status-loading').addClass('loading')
            $('#instance-status-loading').removeClass('running')
            $('#instance-status-loading').removeClass('stopped')

            $('#public-ip').text('Loading')

            main_data()
        },
        error: function (xhr, status, error) {
            alert('Server error')
        }
    });
});
$('#rules-container').on('click', '.edit-port-btn', function () {
    const $form = $(this).closest('.form-rule');
    const protocol = $form.find('.protocol').val();
    const portRange = $form.find('.port-range').val();
    const allowedOption = $form.find('.allowed-ip-option').val();
    const customIP = allowedOption === 'custom' ? $form.find('.custom-ip').val() : allowedOption;

    console.log('Protocol:', protocol);
    console.log('Port Range:', portRange);
    console.log('Allowed IP:', customIP);

    if (!isValidPortRange(portRange)) {
        alert('Invalid port range format.');
        return;
    }

    if (!isValidCIDR(customIP)) {
        alert('Invalid IP address format.');
        return;
    }

    // 포트 범위 파싱
    let fromPort, toPort;
    if (portRange.includes('-')) {
        const [from, to] = portRange.split('-').map(p => parseInt(p, 10));
        fromPort = from;
        toPort = to;
    } else {
        fromPort = toPort = parseInt(portRange, 10);
    }

    // 결과 객체 구성
    const rule = {
        protocol: protocol,
        fromPort: fromPort,
        toPort: toPort,
        sources: [customIP]
    };

    const delete_port = port_info[$form.attr('data-field')]

    console.log(delete_port)

    $.ajax({
        method: 'POST',
        url: `/edit_port`,
        data: { delete_port, instance_id, rule },
        success: function (data) {
            $('#loading-overlay').show();
            $('.main-section').css('opacity', '0.5')

            $('#instance-status-loading').text('loading')
            $('#instance-status-loading').addClass('loading')
            $('#instance-status-loading').removeClass('running')
            $('#instance-status-loading').removeClass('stopped')

            $('#public-ip').text('Loading')

            main_data()
        },
        error: function (xhr, status, error) {
            alert('Server error')
        }
    });
});


// 규칙 삭제
$('#rules-container').on('click', '.remove-port-btn', function () {
    const $form = $(this).closest('.form-rule');
    const protocol = $form.find('.protocol').val();
    const portRange = $form.find('.port-range').val();
    const allowedOption = $form.find('.allowed-ip-option').val();
    const customIP = allowedOption === 'custom' ? $form.find('.custom-ip').val() : allowedOption;

    // 포트 범위 파싱
    let fromPort, toPort;
    if (portRange.includes('-')) {
        const [from, to] = portRange.split('-').map(p => parseInt(p, 10));
        fromPort = from;
        toPort = to;
    } else {
        fromPort = toPort = parseInt(portRange, 10);
    }

    // 결과 객체 구성
    const rule = {
        protocol: protocol,
        fromPort: fromPort,
        toPort: toPort,
        sources: [customIP]
    };

    console.log(rule)

    $.ajax({
        method: 'POST',
        url: `/remove_port`,
        data: { instance_id, rule },
        success: function (data) {
            $('#loading-overlay').show();
            $('.main-section').css('opacity', '0.5')

            $('#instance-status-loading').text('loading')
            $('#instance-status-loading').addClass('loading')
            $('#instance-status-loading').removeClass('running')
            $('#instance-status-loading').removeClass('stopped')

            $('#public-ip').text('Loading')

            main_data()
        },
        error: function (xhr, status, error) {
            alert('Server error')
        }
    });

    $(this).closest('.rule-list').fadeOut(300, function () {
        $(this).remove();
    });
});


// 포트 범위 유효성 검사 함수
function isValidPortRange(input) {
    const singlePort = /^(\d{1,5})$/;
    const portRange = /^(\d{1,5})-(\d{1,5})$/;

    if (singlePort.test(input)) {
        const port = parseInt(input, 10);
        return port >= 1 && port <= 65535;
    }

    const match = input.match(portRange);
    if (match) {
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        return start >= 1 && end <= 65535 && start <= end;
    }

    return false;
}

// CIDR 유효성 검사 함수
function isValidCIDR(cidr) {
    const cidrPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\/([0-9]|[1-2][0-9]|3[0-2])$/;
    return cidrPattern.test(cidr);
}