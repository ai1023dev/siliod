$(function () {
    let isDragging = false;

    $('.deal-line-hover').on('mousedown', function (e) {
        isDragging = true;
        e.preventDefault(); // 드래그 선택 방지
    });

    $(document).on('mousemove', function (e) {
        if (isDragging) {
            console.log('Mouse Y:', e.pageY);
            $('.deal-container').css('height', `calc(100vh - ${e.pageY - 3}px + 2rem)`)
            $('.cards-container').css('height', `calc(${e.pageY - 41}px - 2rem - 5.5rem)`)
        }
    });

    $(document).on('mouseup', function () {
        isDragging = false;
    });
});




const params = new URLSearchParams(window.location.search);

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
                        `<div class="card">
                            <h2>${data.instance[i].name}<span>${type}</span></h2>
                            <hr>
                            <div class="status-row">
                                <span class="status lodeing status-${data.instance[i].instance_id}">lodeing</span>
                                <button class="connect-btn deal-instance-${data.instance[i].instance_id}"
                                    data-fild="${data.instance[i].instance_id}">로딩중</button>
                            </div>
                            <div class="specs">
                                nano - ${data.instance[i].instance_id}
                            </div>
                        </div>`);
                    $(".instance-menu").append(`<button>${data.instance[i].name}</button>`);
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
            for (let i = 0; i < data.length; i++) {
                console.log('.status-' + data[i].instance_id)
                if (data[i].status === 'building') {
                    $('.status-' + data[i].instance_id).text('building')
                } else {
                    if (data[i].status) {
                        $('.status-' + data[i].instance_id).text(data[i].status.instanceState)
                        $('.status-' + data[i].instance_id).removeClass('lodeing')

                        if (data[i].status.instanceState === 'running') {
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
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
        }
    });
} get_instance_data(true)

$('.header-left button').click(function () {
    get_instance_data(false)
})



$('.deal-gui-instance-create').click(async function () {
    $.ajax({
        method: 'POST',
        url: `/create_instance`,
        contentType: 'application/json',
        data: JSON.stringify({
            name: 'asdf',
            type: true,
            ubuntu_password: 'password',
            connect_password: '123456'
        }),
        success: function (data) {
            console.log(data)
            let time
            if (data.ready) {
                time = 3
            } else {
                time = 10
            }

            setTimeout(() => {
                const urlToCheck = `https://${data.instanceId.substring(2)}.siliod.com/`;
                const interval = 15000; // 15초

                const checker = setInterval(async () => {
                    console.log('접속 시도 중...');

                    const accessible = await checkURLAccessible(urlToCheck);

                    if (accessible) {
                        console.log('✅ 접속 가능! 루프 종료');
                        $("body").append(`<iframe src="https://${data.instanceId.substring(2)}.siliod.com/"></iframe>`);
                        clearInterval(checker);
                    } else {
                        console.log('❌ 아직 접속 불가');
                    }
                }, interval);

            }, time * 60 * 1000);
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러')
        }
    });
})

$('.deal-cli-instance-create').click(async function () {
    $.ajax({
        method: 'POST',
        url: `/create_instance`,
        contentType: 'application/json',
        data: JSON.stringify({
            name: 'asdf',
            type: false,
            ubuntu_password: 'password',
            connect_password: '123456'
        }),
        success: function (data) {
            console.log(data);
        },
        error: function (xhr, status, error) {
            alert('서버 측 에러');
        }
    });

})

function checkURLAccessible(instance_id) {
    return fetch(`https://${instance_id}.siliod.com/`, {
        method: 'HEAD',
        mode: 'no-cors'
    })
        .then(() => true)
        .catch(() => false);
}


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


// $(document).on('click', '.deal-instance', function () {
//     console.log($(this).attr('type'))

//     if ($(this).attr('type') === 'start') {
//         $(`.status-${$(this).attr('data-fild')}`).text()
//     }

//     $.ajax({
//         method: 'POST',
//         url: `/${$(this).attr('type')}_instance`,
//         data: { instance_id: $(this).attr('data-fild') },
//         error: function (xhr, status, error) {
//             alert('서버 측 에러')
//         }
//     });
// })