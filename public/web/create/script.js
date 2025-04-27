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


// 비밀번호 보기/숨기기
$(".toggle-password").click(function () {
    const target = $($(this).data("target"));
    const type = target.attr("type") === "password" ? "text" : "password";
    target.attr("type", type);
    $(this).text(type === "password" ? "보기" : "숨기기");
});

// 비밀번호 일치 검사
function checkPasswordMatch(input1, input2) {
    return $(input1).val() === $(input2).val();
}

// 비밀번호 강도 체크
function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;      // 길이 8자 이상
    if (/[A-Z]/.test(password)) strength++;    // 대문자 포함
    if (/[0-9]/.test(password)) strength++;    // 숫자 포함
    if (/[^A-Za-z0-9]/.test(password)) strength++; // 특수문자 포함

    if (strength <= 1) return { level: "weak", text: "약함" };
    else if (strength === 2 || strength === 3) return { level: "medium", text: "보통" };
    else return { level: "strong", text: "강함" };
}

function validateConnectPassword(password) {
    // Connect 비밀번호는 6~8자리로 제한
    if (password.length < 6 || password.length > 8) {
        message = "접속 비밀번호는 6~8자리여야 합니다.";
        return { level: "weak", text: message }
    } else {
        return { level: "strong", text: '' }
    }
}

function updateStrengthIndicator(inputSelector, strengthSelector) {
    $(inputSelector).on('input', function () {
        const password = $(this).val();
        let result
        if (inputSelector === "#ubuntu-password") {
            result = checkPasswordStrength(password);
        } else {
            result = validateConnectPassword(password);
        }
        const indicator = $(strengthSelector);
        indicator.removeClass("weak medium strong").addClass(result.level).text(result.text);
    });
}


// 비밀번호 strength 실시간 표시
updateStrengthIndicator("#ubuntu-password", "#ubuntu-password-strength");
updateStrengthIndicator("#connect-password", "#connect-password-strength");


$('.custom-select').change(function () {
    const selectedValue = $(this).val(); // 선택된 값 가져오기
    let specs;

    switch (selectedValue) {
        case 'nano':
            specs = 'vCPU 2 / 메모리 0.5GiB / 기본 CPU 성능 5% / 시간당 요금 $0.0052';
            break;
        case 'micro':
            specs = 'vCPU 2 / 메모리 1GiB / 기본 CPU 성능 10% / 시간당 요금 $0.0104';
            break;
        case 'small':
            specs = 'vCPU 2 / 메모리 2GiB / 기본 CPU 성능 20% / 시간당 요금 $0.0209';
            break;
        case 'medium':
            specs = 'vCPU 2 / 메모리 4GiB / 기본 CPU 성능 20% / 시간당 요금 $0.0418';
            break;
        case 'large':
            specs = 'vCPU 2 / 메모리 8GiB / 기본 CPU 성능 30% / 시간당 요금 $0.0832';
            break;
        case 'xlarge':
            specs = 'vCPU 4 / 메모리 16GiB / 기본 CPU 성능 40% / 시간당 요금 $0.1664';
            break;
        default:
            specs = '';
    }

    // 선택된 값에 맞는 사양 표시
    $('#speac-strength').text(specs);
});

$('#storage-input').change(function () {
    const selectedValue = $(this).val();
    if (selectedValue >= 8) {
        $('#storage-strength').text('GUI 선택 시 6GiB, CLI 선택 시 3GiB가 기본으로 사용됩니다.').removeClass("weak medium strong");
    } else {
        $('#storage-strength').text('최소 스토리지 용량은 8GiB입니다.').removeClass("weak medium strong").addClass('weak');
    }
});


$('#ip').change(function () {
    const isValid = ip_cheak()
    if (isValid) {
        $('#ip-strength').text("유효한 IP 입력입니다.").removeClass("weak strong").addClass('strong');
    } else {
        $('#ip-strength').text("유효하지 않은 IP가 포함되어 있습니다.").removeClass("weak strong").addClass('weak');
    }
});

function ip_cheak() {
    const selectedValue = $('#ip').val();

    // '0.0.0.0/0'은 모든 접속 허용, 이를 바로 통과시킴
    if (selectedValue === '0.0.0.0/0') {
        return true;  // 모든 접속 허용은 유효
    }

    // IP 유효성 검사 함수
    function isValidIP(ip) {
        const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipPattern.test(ip);
    }

    // 각 IP 주소를 검사
    if (!isValidIP(selectedValue)) {
        return false;  // 유효하지 않으면 false 반환
    }
    return true;  // 모든 IP가 유효하면 true 반환
}




// 생성 버튼 클릭
$("#create-instance-btn").click(function () {
    const ubuntuMatch = checkPasswordMatch("#ubuntu-password", "#ubuntu-password-confirm");
    const connectMatch = checkPasswordMatch("#connect-password", "#connect-password-confirm");

    // 필드가 비어있는지 확인
    const instanceName = $("#instance-name").val();
    const storage = $("#storage-input").val();
    const ubuntuPassword = $("#ubuntu-password").val();
    const ubuntuPasswordConfirm = $("#ubuntu-password-confirm").val();
    const connectPassword = $("#connect-password").val();
    const connectPasswordConfirm = $("#connect-password-confirm").val();

    // 라디오 버튼 선택 여부 확인
    const interfaceSelected = $("input[name='interface']:checked").length > 0;

    if (!instanceName.trim() || !ubuntuPassword.trim() || !ubuntuPasswordConfirm.trim() || !connectPassword.trim() || !connectPasswordConfirm.trim()) {
        alert("모든 필드를 채워주세요.");
        return;
    }

    if (instanceName !== instanceName.includes(' ')) {
        alert("인스턴스 이름에 공백이 포함되어 있습니다.");
        return;
    }

    // 라디오 버튼이 선택되지 않으면 경고
    if (!interfaceSelected) {
        alert("접속 방식을 선택해주세요.");
        return;
    }

    if (storage < 8) {
        alert("최소 스토리지 용량은 8GiB입니다.");
        return;
    }

    // 비밀번호 일치 검사
    if (!ubuntuMatch) {
        alert("Ubuntu 비밀번호가 일치하지 않습니다.");
        return;
    }
    if (!connectMatch) {
        alert("접속 비밀번호가 일치하지 않습니다.");
        return;
    }

    if (connectPassword.length < 6 || connectPassword.length > 8) {
        alert("접속 비밀번호는 6~8자리여야 합니다.");
        return;
    }

    if (!ip_cheak()) {
        alert("유효하지 않은 IP가 포함되어 있습니다..");
        return;
    }

    let type = true
    if ($("input[name='interface']:checked").val() === 'cli') {
        type = false
    }


    $.ajax({
        method: 'POST',
        url: `/create_instance`,
        contentType: 'application/json',
        data: JSON.stringify({
            name: instanceName,
            type,
            grade: $(".custom-select").val(),
            source: $("#ip").val(),
            storage,
            ubuntu_password: ubuntuPassword,
            connect_password: connectPassword
        }),
        success: function (data) {
            console.log(data);
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러');
        }
    });
});

$.ajax({
    method: 'GET',
    url: `https://api.ipify.org?format=json`,
    success: function (data) {
        $("#ip").val(data.ip)
    },
    error: function (xhr, status, error) {
        alert('서버 측 에러');
    }
});