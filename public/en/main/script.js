const params = new URLSearchParams(window.location.search);

if (params.get("result")) {
    if (params.get("result") === 'success') {
        const paymentKey = params.get("paymentKey");
        const orderId = params.get("orderId");
        const amount = params.get("amount");

        async function confirm() {
            const requestData = {
                paymentKey: paymentKey,
                orderId: orderId,
                amount: amount,
            };

            console.log(requestData)

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
                // 결제 성공 비즈니스 로직을 구현하세요.
                console.log(json);
                alert('Payment Completed')
                window.location.href = '/'
            }
        }
        confirm();
    }

    if (params.get("result") === 'fail') {
        alert(params.get("message"))
        window.location.href = '/'
    }
} else {

    $('#dino-btn').click(function () {
        $(".dino-modal-backdrop").removeClass("hidden").fadeIn(300); // 천천히 보이게
        $("#dino-iframe").attr('src', '/dino');
    })

    $('#dino-x').click(function () {
        $(".dino-modal-backdrop").fadeOut(300, function () {
            $(".dino-modal-backdrop").addClass("hidden");
            $("#dino-iframe").attr('src', '');
        });
    })


    new ClipboardJS('.copy-btn');


    let open_height
    $(function () {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        let isDragging = false;

        if (isMobile) {
            $('<link rel="stylesheet" href="web/main/mobile.css"/>').appendTo('head');
            open_height = '502px'

            // 모바일용 터치 이벤트로 드래그 구현
            $('.deal-line-hover').on('touchstart', function (e) {
                isDragging = true;
                e.preventDefault(); // 스크롤 방지
            });

            $(document).on('touchmove', function (e) {
                if (isDragging) {
                    const touch = e.originalEvent.touches[0]; // 첫 번째 손가락 기준
                    const pageY = touch.pageY;
                    $('.deal-container').css('height', `calc(100vh - ${pageY - 3}px)`);
                    $('.cards-container').css('height', `calc(${pageY - 41}px - 7rem)`);
                }
            });

            $(document).on('touchend touchcancel', function () {
                isDragging = false;
            });
        }
        else {
            open_height = '558px'

            $('.deal-line-hover').on('mousedown', function (e) {
                isDragging = true;
                e.preventDefault(); // 드래그 선택 방지
            });

            $(document).on('mousemove', function (e) {
                if (isDragging) {
                    $('.deal-container').css('height', `calc(100vh - ${e.pageY - 3}px + 2rem)`)
                    $('.cards-container').css('height', `calc(${e.pageY - 41}px - 7.5rem)`)
                }
            });

            $(document).on('mouseup', function () {
                isDragging = false;
            });
        }
    });



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
                        $(".balance-amount").text(data.user.amount + 'p');
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
                            `<div class="card open-deal" data-field=["${data.instance[i].instance_id}","${data.instance[i].name}","${type}"]>
                            <h2>${data.instance[i].name}<span>${type}</span></h2>
                            <hr>
                            <div class="status-row">
                                <span class="status loading status-${data.instance[i].instance_id}">loading</span>
                                <button class="connect-btn deal-instance-${data.instance[i].instance_id}"
                                    data-field="${data.instance[i].instance_id}">Loading</button>
                            </div>
                            <div class="specs">
                                ${data.instance[i].grade} - ${data.instance[i].instance_id}
                            </div>
                        </div>`);
                    }

                    if (params.get("new") === 'new') {
                        alert('New Customer')
                    }
                } else {
                    $(".login-modal-backdrop").removeClass("hidden");
                }
            },
            error: function (xhr, status, error) {
                alert('Server-side Error')
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
                        $('.deal-instance-' + data[i].instance_id).text('Creating')
                    } else {
                        if (data[i].status) {
                            $('.status-' + data[i].instance_id).text(data[i].status)
                            $('.status-' + data[i].instance_id).removeClass('loading')

                            if (data[i].status === 'running') {
                                running = running + 1
                                $('.deal-instance-' + data[i].instance_id).text('Connect')
                                $('.status-' + data[i].instance_id).addClass('running')
                                $('.deal-instance-' + data[i].instance_id).attr('running', 'true')
                            } else {
                                $('.deal-instance-' + data[i].instance_id).text('Start')
                                $('.status-' + data[i].instance_id).addClass('stopped')
                                $('.deal-instance-' + data[i].instance_id).attr('running', 'false')
                            }
                        } else {
                            $('.status-' + data[i].instance_id).text('no data')
                        }
                    }
                }

                $(".summation").text(`${data.length} Instances / ${running} Running`)
            },
            error: function (xhr, status, error) {
                alert('Server-side Error')
            }
        });
    } get_instance_data(true)

    $('.header-left button').click(function () {
        get_instance_data(false)
    })


    $(document).on('click', '.connect-btn', function () {
        if ($(this).attr('running') === 'true') {
            window.open(`https://${$(this).attr('data-field')}.siliod.com/`, '_blank');
        } else {
            console.log('saaaa')
            $(`.status-${$(this).attr('data-field')}`).text('pending')
            $(this).attr('running', 'true')

            $.ajax({
                method: 'POST',
                url: 'start_instance',
                data: { instance_id: $(this).attr('data-field') },
                success: function (data) {
                    console.log(data);
                    if (!data) {
                        alert('!!!!!!!!!!')
                    }
                },
                error: function (xhr, status, error) {
                    alert('Server-side Error')
                }
            });
        }
    })

    let main_data
    $(document).on('click', '.open-deal', function () {
        main_data = JSON.parse($(this).attr('data-field'))
        $('.deal-container').css('height', open_height)
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
        $('#copy-connect-url').attr('data-clipboard-text', 'https://' + main_data[0] + '.siliod.com')
        $('#public-ip').text('Loading')
        $('#btn-more').attr('href', `/more?id=${main_data[0]}`)

        if (main_data[2] === 'GUI') {
            $('#connect-label').text('Instance Connection')
        } else {
            $('#connect-label').text("Instance Connection (enter 'admin' in id field)")
        }

        $('#instance-status-loading').text('loading')
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
                $('#copy-private-ip').attr('data-clipboard-text', data.instance.private_ip)
                $('#instance-grade').text(data.instance.grade)

                console.log(data.state)

                if (data.instance.build) {
                    $('.status-' + main_data[0]).text('buliding')
                    $('#instance-status-loading').text('buliding')

                    $('#no-connect').text('Instance is being created')
                    $('#no-connect').css('display', 'inline')
                    $('#connect-iframe').css('display', 'none')

                    $('#btn-start').css('display', 'none')
                    $('#btn-restart').css('display', 'none')
                    $('#btn-stop').css('display', 'none')

                    $('.deal-instance-' + main_data[0]).text('Creating')
                } else {
                    $('.status-' + main_data[0]).text(data.state)
                    $('#instance-status-loading').text(data.state)
                    $('#instance-status-loading').removeClass('loading')

                    if (data.state === 'running') {
                        $('#instance-status-loading').addClass('running')
                        $('.status-' + main_data[0]).addClass('running')

                        $('#connect-iframe').css('display', 'inline')
                        $('#connect-iframe').attr('src', 'https://' + main_data[0] + '.siliod.com')
                        $('#no-connect').css('display', 'none')

                        $('#btn-start').css('display', 'none')
                        $('#btn-restart').css('display', 'inline')
                        $('#btn-stop').css('display', 'inline')

                        $('.deal-instance-' + main_data[0]).text('Connect')
                        $('.deal-instance-' + main_data[0]).attr('running', 'true')
                    } else {
                        $('#instance-status-loading').addClass('stopped')
                        $('.status-' + main_data[0]).addClass('stopped')

                        $('#no-connect').text('Instance is not running')
                        $('#no-connect').css('display', 'inline')
                        $('#connect-iframe').css('display', 'none')
                        $('#connect-iframe').attr('src', '')

                        $('#btn-start').css('display', 'inline')
                        $('#btn-restart').css('display', 'none')
                        $('#btn-stop').css('display', 'none')

                        $('.deal-instance-' + main_data[0]).text('Start')
                        $('.deal-instance-' + main_data[0]).attr('running', 'false')
                    }
                }
            },
            error: function (xhr, status, error) {
                alert('Server-side Error')
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
                    $('#copy-public-ip').attr('data-clipboard-text', data)
                    $('#copy-public-ip').css('display', 'inline')
                } else {
                    $('#public-ip').text('Instance is not running')
                    $('#copy-public-ip').css('display', 'none')
                }
            },
            error: function (xhr, status, error) {
                alert('Server-side Error')
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
                alert('Server-side Error')
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
                alert('Server-side Error')
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
                alert('Server-side Error')
            }
        });
    });
}