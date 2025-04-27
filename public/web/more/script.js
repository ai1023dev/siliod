$.ajax({
    method: 'GET',
    url: '/login_cheak',
    success: function (data) {
        console.log(data)
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
const instance_id = params.get("id")
console.log(instance_id)

function main_data() {
    $.ajax({
        method: 'POST',
        url: `/instance_info`,
        data: { instance_id },
        success: function (data) {
            $('.main-section').css('opacity', '1')

            $('#instance-name').val(data.instance.name)
            if (data.instance.type) {
                $('#instance-type-label').text('GUI')
            } else {
                $('#instance-type-label').text('CLI')
            }
            $('#instance-id').text(instance_id)
            $('#instance-connect-url').text(instance_id + '.siliod.com')
            $('#instance-connect-url').attr('href', 'https://' + instance_id + '.siliod.com')


            console.log(data);
            $('#private-ip').text(data.instance.private_ip)
            $('#instance-status-loading').text(data.state)
            $('#instance-status-loading').removeClass('loading')
            $('.status-' + instance_id).text(data.state)

            console.log(data.state)
            if (data.state === 'running') {
                $('#instance-status-loading').addClass('running')
                $('#btn-start').css('display', 'none')
                $('#btn-restart').css('display', 'inline')
                $('#btn-stop').css('display', 'inline')

                $('iframe').css('display', 'inline')
                $('iframe').attr('src', 'https://' + instance_id + '.siliod.com')
                $('#no-connect').css('display', 'none')

                $('.deal-instance-' + instance_id).text('접속하기')
                $('.status-' + instance_id).addClass('running')
                $('.deal-instance-' + instance_id).attr('running', 'true')
            } else {
                $('#instance-status-loading').addClass('stopped')
                $('#btn-start').css('display', 'inline')
                $('#btn-restart').css('display', 'none')
                $('#btn-stop').css('display', 'none')

                $('#no-connect').text('인스턴스가 실행되지않음')
                $('#no-connect').css('display', 'inline')
                $('iframe').css('display', 'none')
                $('iframe').attr('src', '')

                $('.deal-instance-' + instance_id).text('시작하기')
                $('.status-' + instance_id).addClass('stopped')
                $('.deal-instance-' + instance_id).attr('running', 'false')
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
        url: `/inbound_info`,
        data: { instance_id },
        success: function (data) {
            console.log(data);
            $('#rules-container').empty();

            for (let i = 0; i < data.length; i++) {
                createRule(data[i])
            }
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
        }
    });
}

main_data()

$('#refresh').click(function () {
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






function createRule(rule = {}) {
    const protocol = rule.protocol?.toUpperCase() || 'TCP';
    const portRange = (rule.fromPort !== undefined && rule.toPort !== undefined)
        ? (rule.fromPort === rule.toPort ? `${rule.fromPort}` : `${rule.fromPort}-${rule.toPort}`)
        : '';
    const source = rule.sources?.[0] || '0.0.0.0/0';
    const isCustomIP = source !== '0.0.0.0/0';

    const ruleHtml = `
        <div class="rule-list">
            <div class="form-rule">
                <div class="form-group">
                    <label>프로토콜</label>
                    <select class="protocol">
                        <option value="TCP" ${protocol === 'TCP' ? 'selected' : ''}>TCP</option>
                        <option value="UDP" ${protocol === 'UDP' ? 'selected' : ''}>UDP</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>포트 범위</label>
                    <input type="text" class="port-range" placeholder="예: 80 또는 1000-2000" value="${portRange}">
                </div>
                <div class="form-group">
                    <label>허용 IP</label>
                    <select class="allowed-ip-option">
                        <option value="0.0.0.0/0" ${!isCustomIP ? 'selected' : ''}>모든 IP 허용 (0.0.0.0/0)</option>
                        <option value="custom" ${isCustomIP ? 'selected' : ''}>지정 IP</option>
                    </select>
                    <input type="text" class="custom-ip" placeholder="IP 입력" value="${isCustomIP ? source : ''}" style="${isCustomIP ? '' : 'display:none;'}">
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

// 규칙 삭제
$('#rules-container').on('click', '.remove-port-btn', function () {
    $(this).closest('.rule-list').remove();
});