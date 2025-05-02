$(function () {
    let isDragging = false;

    $('.deal-line-hover').on('mousedown', function (e) {
        isDragging = true;
        e.preventDefault(); // 드래그 선택 방지
    });

    $(document).on('mousemove', function (e) {
        if (isDragging) {
            $('.deal-container').css('height', `calc(100vh - ${e.pageY - 3}px + 2rem)`)
            $('.cards-container').css('height', `calc(${e.pageY - 41}px - 2rem - 5.5rem)`)
        }
    });

    $(document).on('mouseup', function () {
        isDragging = false;
    });
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




const params = new URLSearchParams(window.location.search);

if (params.get("result") === 'success') {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentKey = urlParams.get("paymentKey");
    const orderId = urlParams.get("orderId");
    const amount = urlParams.get("amount");

    async function confirm() {
        const requestData = {
            paymentKey: paymentKey,
            orderId: orderId,
            amount: amount,
        };

        const response = await fetch("/confirm", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
        });

        const json = await response.json();

        if (!response.ok) {
            // 결제 실패 비즈니스 로직을 구현하세요.
            console.log(json);
            window.location.href = `/?result=fail&message=${json.message}&code=${json.code}`;
        } else {
            alert('결제성공')
        }

        // 결제 성공 비즈니스 로직을 구현하세요.
        console.log(json);
    }
    confirm();
}

if (params.get("result") === 'fail') {
    alert('결제 실패')
}

function get_instance_data(first) {
    $.ajax({
        method: 'GET',
        url: '/my_data',
        success: function (data) {
            console.log(data)
            if (data.user !== null) {
                if (first) {
                    $(".avatar").attr('src', data.user.avatar_url);
                    $(".username").text(data.user.name);
                } else {
                    $(".cards-container-data").empty()
                }

                for (let i = 0; i < data.instance.length; i++) {
                    let type
                    if (data.instance[i].type) {
                        type = 'GUI'
                    } else {
                        type = 'CLI'
                    }

                    $(".cards-container-data").append(
                        `<div class="card open-deal" data-fild=["${data.instance[i].instance_id}","${data.instance[i].name}","${type}"]>
                            <h2>${data.instance[i].name}<span>${type}</span></h2>
                            <hr>
                            <div class="status-row">
                                <span class="status loading status-${data.instance[i].instance_id}">loading</span>
                                <button class="connect-btn deal-instance-${data.instance[i].instance_id}"
                                    data-fild="${data.instance[i].instance_id}">로딩중</button>
                            </div>
                            <div class="specs">
                                nano - ${data.instance[i].instance_id}
                            </div>
                        </div>`);
                }

                if (params.get("new") === 'new') {
                    alert('새고객')
                }
            } else {
                $(".login-modal-backdrop").removeClass("hidden");
            }
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
        }
    });

    $.ajax({
        method: 'GET',
        url: '/status',
        success: function (data) {
            console.log(data)
            let running = 0

            for (let i = 0; i < data.length; i++) {
                console.log('.status-' + data[i].instance_id)
                if (data[i].status === 'building') {
                    $('.status-' + data[i].instance_id).text('building')
                } else {
                    if (data[i].status) {
                        $('.status-' + data[i].instance_id).text(data[i].status)
                        $('.status-' + data[i].instance_id).removeClass('loading')

                        if (data[i].status === 'running') {
                            running = running + 1
                            $('.deal-instance-' + data[i].instance_id).text('접속하기')
                            $('.status-' + data[i].instance_id).addClass('running')
                            $('.deal-instance-' + data[i].instance_id).attr('running', 'true')
                        } else {
                            $('.deal-instance-' + data[i].instance_id).text('시작하기')
                            $('.status-' + data[i].instance_id).addClass('stopped')
                            $('.deal-instance-' + data[i].instance_id).attr('running', 'false')
                        }
                    } else {
                        $('.status-' + data[i].instance_id).text('no data')
                    }
                }
            }

            $(".summation").text(`${data.length} 인스턴스 / ${running} 실행중`)
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
        }
    });
} get_instance_data(true)

$('.header-left button').click(function () {
    get_instance_data(false)
})


$(document).on('click', '.connect-btn', function () {
    if ($(this).attr('running') === 'true') {
        window.open(`https://${$(this).attr('data-fild')}.siliod.com/`, '_blank');
    } else {
        console.log('saaaa')
        $(`.status-${$(this).attr('data-fild')}`).text('pending')
        $(this).attr('running', 'true')

        $.ajax({
            method: 'POST',
            url: 'start_instance',
            data: { instance_id: $(this).attr('data-fild') },
            success: function (data) {
                console.log(data);
                if (!data) {
                    alert('!!!!!!!!!!')
                }
            },
            error: function (xhr, status, error) {
                alert('서버 측 에러')
            }
        });
    }
})

let main_data
$(document).on('click', '.open-deal', function () {
    main_data = JSON.parse($(this).attr('data-fild'))
    $('.deal-container').css('height', 'calc(430px + 7rem)')
    deal_open()
})

$(document).on('click', '.deal-refresh', function () {
    deal_open()
})

function deal_open() {
    $('#instance-name').text(main_data[1])
    $('#instance-type-label').text(main_data[2])
    $('#instance-id').text(main_data[0])
    $('#instance-connect-url').text(main_data[0] + '.siliod.com')
    $('#instance-connect-url').attr('href', 'https://' + main_data[0] + '.siliod.com')
    $('#public-ip').text('로딩중')
    $('#btn-more').attr('href', `/more?id=${main_data[0]}`)

    $('#instance-status-loading').text('lodeing')
    $('#instance-status-loading').addClass('loading')
    $('#instance-status-loading').removeClass('running')
    $('#instance-status-loading').removeClass('stopped')

    $('.status-' + main_data[0]).text('loading')
    $('.status-' + main_data[0]).addClass('loading')
    $('.status-' + main_data[0]).removeClass('running')
    $('.status-' + main_data[0]).removeClass('stopped')

    $.ajax({
        method: 'POST',
        url: `/instance_info`,
        data: { instance_id: main_data[0] },
        success: function (data) {
            console.log(data);
            $('#private-ip').text(data.instance.private_ip)
            $('#instance-status-loading').text(data.state)
            $('#instance-status-loading').removeClass('loading')
            $('.status-' + main_data[0]).text(data.state)

            console.log(data.state)
            if (data.state === 'running') {
                $('#instance-status-loading').addClass('running')
                $('#btn-start').css('display', 'none')
                $('#btn-restart').css('display', 'inline')
                $('#btn-stop').css('display', 'inline')

                $('iframe').css('display', 'inline')
                $('iframe').attr('src', 'https://' + main_data[0] + '.siliod.com')
                $('#no-connect').css('display', 'none')

                $('.deal-instance-' + main_data[0]).text('접속하기')
                $('.status-' + main_data[0]).addClass('running')
                $('.deal-instance-' + main_data[0]).attr('running', 'true')
            } else {
                $('#instance-status-loading').addClass('stopped')
                $('#btn-start').css('display', 'inline')
                $('#btn-restart').css('display', 'none')
                $('#btn-stop').css('display', 'none')

                $('#no-connect').text('인스턴스가 실행되지않음')
                $('#no-connect').css('display', 'inline')
                $('iframe').css('display', 'none')
                $('iframe').attr('src', '')

                $('.deal-instance-' + main_data[0]).text('시작하기')
                $('.status-' + main_data[0]).addClass('stopped')
                $('.deal-instance-' + main_data[0]).attr('running', 'false')
            }
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
        }
    });

    $.ajax({
        method: 'POST',
        url: `/instance_info_ip`,
        data: { instance_id: main_data[0] },
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
}





$(document).on('click', '#btn-start', function () {
    $('#instance-status-loading').text('pending')
    $('#instance-status-loading').removeClass('loading')
    $('#instance-status-loading').addClass('stopped')
    $('#btn-start').css('display', 'none')
    $('#btn-restart').css('display', 'inline')
    $('#btn-stop').css('display', 'inline')
    $('.status-' + main_data[0]).text('pending')
    $('.status-' + main_data[0]).removeClass('loading')
    $('.status-' + main_data[0]).addClass('stopped')

    $.ajax({
        method: 'POST',
        url: 'start_instance',
        data: { instance_id: main_data[0] },
        success: function (data) {
            console.log(data);
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
        }
    });
});

$(document).on('click', '#btn-restart', function () {
    $('#instance-status-loading').text('pending')
    $('#instance-status-loading').removeClass('loading')
    $('#instance-status-loading').addClass('stopped')
    $('#btn-start').css('display', 'inline')
    $('#btn-restart').css('display', 'none')
    $('#btn-stop').css('display', 'none')
    $('.status-' + main_data[0]).text('pending')
    $('.status-' + main_data[0]).removeClass('loading')
    $('.status-' + main_data[0]).addClass('stopped')

    $.ajax({
        method: 'POST',
        url: 'reboot_instance',
        data: { instance_id: main_data[0] },
        success: function (data) {
            console.log(data);
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
        }
    });
});

$(document).on('click', '#btn-stop', function () {
    $('#instance-status-loading').text('stopping')
    $('#instance-status-loading').removeClass('loading')
    $('#instance-status-loading').addClass('stopped')
    $('#btn-start').css('display', 'inline')
    $('#btn-restart').css('display', 'none')
    $('#btn-stop').css('display', 'none')
    $('.status-' + main_data[0]).text('stopping')
    $('.status-' + main_data[0]).removeClass('loading')
    $('.status-' + main_data[0]).addClass('stopped')

    $.ajax({
        method: 'POST',
        url: 'stop_instance',
        data: { instance_id: main_data[0] },
        success: function (data) {
            console.log(data);
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
        }
    });
});