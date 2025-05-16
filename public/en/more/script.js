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
        alert('서버 측 에러')
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
            $('.status-' + instance_id).text(data.state)

            console.log(data.state)
            if (data.state === 'running') {
                $('#instance-status-loading').addClass('running')
            } else {
                $('#instance-status-loading').addClass('stopped')
            }
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
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
                $('#public-ip').text('인스턴트가 시작 되지 않음')
            }
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
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
            alert('서버 측 에러')
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

    $('#public-ip').text('로딩중')

    main_data()
})

$('#delete-incetance').click(function () {
    if (confirm("정말 인스턴스를 삭제 하시겠습니까?")) {
        $.ajax({
            method: 'POST',
            url: `/delete_instance`,
            data: { instance_id },
            success: function (data) {
                window.location.href = window.location.origin;
            },
            error: function (xhr, status, error) {
                alert('서버 측 에러')
            }
        });
    }
})


let my_ip
$.ajax({
    method: 'GET',
    url: `https://api.ipify.org?format=json`,
    success: function (data) {
        my_ip = data.ip + '/32'
    },
    error: function (xhr, status, error) {
        alert('서버 측 에러');
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
                    <label>프로토콜</label>
                    <select class="protocol">
                        <option value="tcp" ${protocol === 'TCP' ? 'selected' : ''}>TCP</option>
                        <option value="udp" ${protocol === 'UDP' ? 'selected' : ''}>UDP</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>포트 범위 (범위 표기는 '-'으로 구분)</label>
                    <input type="text" class="port-range" placeholder="예: 80 또는 1000-2000" value="${portRange}">
                </div>
                <div class="form-group">
                    <label>허용 IP (CIDR 표기 필수)</label>
                    <select class="allowed-ip-option">
                        <option value="0.0.0.0/0" ${!isCustomIP ? 'selected' : ''}>모든 IP 허용 (0.0.0.0/0)</option>
                        <option value="custom" ${isCustomIP ? 'selected' : ''}>지정 IP</option>
                    </select>
                    <input type="text" class="custom-ip" placeholder="IP 입력" value="${isCustomIP ? source : my_ip}" style="${isCustomIP ? '' : 'display:none;'}">
                </div>
                ${rule.protocol ? '<button class="remove-port-btn">삭제</button>' : '<button class="add-port-btn">추가</button>'}
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
            .text('수정');
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
        alert('포트 범위 형식이 잘못되었습니다.');
        return;
    }

    if (!isValidCIDR(customIP)) {
        alert('IP주소 형식이 잘못 되었습니다.');
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

            $('#public-ip').text('로딩중')

            main_data()
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
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
        alert('포트 범위 형식이 잘못되었습니다.');
        return;
    }

    if (!isValidCIDR(customIP)) {
        alert('IP주소 형식이 잘못 되었습니다.');
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

            $('#public-ip').text('로딩중')

            main_data()
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
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

            $('#public-ip').text('로딩중')

            main_data()
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
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